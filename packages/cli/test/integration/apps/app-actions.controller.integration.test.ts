import type { AppBlock, AppVersionSnapshot } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AppRepository } from '@/modules/apps/app.repository';
import { AppVersionRepository } from '@/modules/apps/app-version.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { AppTokenService } from '@/modules/apps/serving/app-token.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { createDataTable } from '@test-integration/db/data-tables';
import { createOwner } from '@test-integration/db/users';
import { getPersonalProject } from '@n8n/backend-test-utils';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No session: the access token in the Authorization header is this endpoint's only credential. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps', 'data-table'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;
let appVersionRepository: AppVersionRepository;
let appTokenService: AppTokenService;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);
	appVersionRepository = Container.get(AppVersionRepository);
	appTokenService = Container.get(AppTokenService);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page', 'AppVersion', 'DataTable', 'DataTableColumn']);
});

const codeBlock = (id: string, source: string): AppBlock =>
	({ id, type: 'code', data: { source } }) as AppBlock;

/** One `name`/`amount` row per entry, plus a table block over it with the given flags. */
async function createTableWithBlock(flags: { editable?: boolean; deletable?: boolean }) {
	const dataTable = await createDataTable(ownerProject, {
		columns: [
			{ name: 'name', type: 'string' },
			{ name: 'amount', type: 'number' },
		],
		data: [{ name: 'Ada', amount: 1 }],
	});
	const block: AppBlock = {
		id: 'table-1',
		type: 'table',
		data: { source: { dataTableId: dataTable.id }, limit: 50, ...flags },
	};
	const listRows = async () =>
		(await Container.get(DataTableService).getManyRowsAndCount(dataTable.id, ownerProject.id, {}))
			.data;
	return { block, listRows };
}

/** Creates a published App with one page holding `blocks`, and an anonymous access token for it. */
async function publishAppWithBlocks(blocks: AppBlock[], namespace = 'acme') {
	const app = await appRepository.createApp(ownerProject.id, 'Acme Portal', namespace);
	const page = await pageRepository.createPage(app.id, null, '');
	await pageRepository.updatePage(page, { content: blocks });

	const snapshot: AppVersionSnapshot = {
		pages: [{ id: page.id, route: page.route, parentPageId: null, content: blocks, layout: null }],
		theme: null,
	};
	const version = await appVersionRepository.createFromSnapshot(app.id, snapshot, owner.id);
	await appRepository.setActiveVersionId(app, version.id);

	const pair = await appTokenService.exchangeCode(
		await appTokenService.issueCode({ appId: app.id, viewerId: null, sessionToken: null }),
	);
	if (!pair) throw new Error('Code exchange failed');

	return { app, page, bearer: `Bearer ${pair.accessToken}` };
}

const actionUrl = (namespace: string, pageId: string, blockId: string, name: string) =>
	`/apps/${namespace}/_actions/${pageId}/${blockId}/${name}`;

describe('POST /apps/:namespace/_actions/:pageId/:blockId/:name', () => {
	test('runs a code block action and returns its { data } result as JSON', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				`export function render() { return 'unused'; }
				 export const actions = { greet: async (ctx) => ({ data: { hello: ctx.input.name } }) };`,
			),
		]);

		const response = await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'greet'))
			.set('Authorization', bearer)
			.send({ name: 'Ada' })
			.expect(200);

		expect(response.body).toEqual({ data: { hello: 'Ada' } });
	});

	test('builds ctx.actionUrl() without a query', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: (ctx) => ({ data: ctx.actionUrl('go') }) };",
			),
		]);

		const response = await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.set('Authorization', bearer)
			.send({})
			.expect(200);

		expect(response.body.data).toMatch(
			new RegExp(`^http://[^/]+${actionUrl('acme', page.id, 'block-1', 'go')}$`),
		);
	});

	test('redirects (303) when the action returns { redirect }', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: () => ({ redirect: '/apps/acme/thanks' }) };",
			),
		]);

		await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.set('Authorization', bearer)
			.send({})
			.expect(303)
			.expect('Location', '/apps/acme/thanks');
	});

	test('refuses a redirect that escapes the app through path traversal', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: () => ({ redirect: '/apps/acme/../../signin' }) };",
			),
		]);

		const response = await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.set('Authorization', bearer)
			.send({})
			.expect(400);

		expect(response.body).toEqual({ error: 'Redirect target is outside this app' });
	});

	test('answers 400 for an action that returns { error }', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { fail: () => ({ error: 'nope' }) };",
			),
		]);

		const response = await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'fail'))
			.set('Authorization', bearer)
			.send({})
			.expect(400);

		expect(response.body).toEqual({ error: 'nope' });
	});

	test('rejects a token of another app', async () => {
		const { page } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: () => ({ data: 1 }) };",
			),
		]);
		const other = await publishAppWithBlocks(
			[codeBlock('block-x', 'export function render() { return ""; }')],
			'other',
		);

		await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.set('Authorization', other.bearer)
			.send({})
			.expect(401);
	});

	test('rejects a request with no token at all', async () => {
		const { page } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: () => ({ data: 1 }) };",
			),
		]);

		await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.send({})
			.expect(401);
	});

	test('ignores a token sent in the query or the body', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock(
				'block-1',
				"export function render() { return ''; } export const actions = { go: () => ({ data: 1 }) };",
			),
		]);
		const token = bearer.slice('Bearer '.length);

		await visitor
			.post(actionUrl('acme', page.id, 'block-1', 'go'))
			.query({ _token: token })
			.send({ _token: token })
			.expect(401);
	});

	test('runs an action of a layout block through the owner page named in the URL', async () => {
		const { app, page, bearer } = await publishAppWithBlocks([]);
		const layout = [
			codeBlock(
				'layout-code',
				"export function render() { return ''; } export const actions = { go: (ctx) => ({ data: { menu: ctx.menu, url: ctx.actionUrl('go') } }) };",
			),
			{ id: 'slot', type: 'slot' as const, data: {} },
		];
		const child = await pageRepository.createPage(app.id, page.id, 'child');
		const snapshot: AppVersionSnapshot = {
			pages: [
				{ id: page.id, route: page.route, parentPageId: null, content: [], layout },
				{ id: child.id, route: 'child', parentPageId: page.id, content: null, layout: null },
			],
			theme: null,
		};
		const version = await appVersionRepository.createFromSnapshot(app.id, snapshot, owner.id);
		await appRepository.setActiveVersionId(app, version.id);

		const response = await visitor
			.post(actionUrl('acme', page.id, 'layout-code', 'go'))
			.set('Authorization', bearer)
			.send({})
			.expect(200);

		expect(response.body.data.menu).toEqual([]);
		expect(response.body.data.url).toMatch(
			new RegExp(`${actionUrl('acme', page.id, 'layout-code', 'go')}$`),
		);
	});

	test('answers 404 for a block that does not exist on the page', async () => {
		const { page, bearer } = await publishAppWithBlocks([
			codeBlock('block-1', 'export function render() { return ""; }'),
		]);

		await visitor
			.post(actionUrl('acme', page.id, 'missing-block', 'go'))
			.set('Authorization', bearer)
			.send({})
			.expect(404);
	});

	test('answers CORS preflight with Origin: null and an Authorization allowance', async () => {
		const { page } = await publishAppWithBlocks([
			codeBlock('block-1', 'export function render() { return ""; }'),
		]);

		const response = await visitor
			.options(actionUrl('acme', page.id, 'block-1', 'go'))
			.set('Origin', 'null')
			.expect(204);

		expect(response.headers['access-control-allow-origin']).toBe('*');
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
		expect(response.headers['access-control-max-age']).toBe('600');
	});

	test('updates a row of an editable table block and redirects back to the page', async () => {
		const { block, listRows } = await createTableWithBlock({ editable: true });
		const { page, bearer } = await publishAppWithBlocks([block]);
		const [row] = await listRows();

		await visitor
			.post(actionUrl('acme', page.id, 'table-1', 'update'))
			.set('Authorization', bearer)
			.type('form')
			.send({ id: String(row.id), name: 'Grace', amount: '2.5' })
			.expect(303)
			.expect('Location', '/apps/acme?_form=table-1&_status=ok');

		expect(await listRows()).toEqual([expect.objectContaining({ name: 'Grace', amount: 2.5 })]);
	});

	test('deletes a row of a deletable table block', async () => {
		const { block, listRows } = await createTableWithBlock({ deletable: true });
		const { page, bearer } = await publishAppWithBlocks([block]);
		const [row] = await listRows();

		await visitor
			.post(actionUrl('acme', page.id, 'table-1', 'delete'))
			.set('Authorization', bearer)
			.type('form')
			.send({ id: String(row.id) })
			.expect(303);

		expect(await listRows()).toEqual([]);
	});

	test('refuses a table action the block does not allow', async () => {
		const { block, listRows } = await createTableWithBlock({ editable: true });
		const { page, bearer } = await publishAppWithBlocks([block]);
		const [row] = await listRows();

		const response = await visitor
			.post(actionUrl('acme', page.id, 'table-1', 'delete'))
			.set('Authorization', bearer)
			.send({ id: String(row.id) })
			.expect(400);

		expect(response.body).toEqual({ error: 'Action not found' });
		expect(await listRows()).toHaveLength(1);
	});
});
