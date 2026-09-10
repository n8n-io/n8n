import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { AppContent, AppLayout } from '@n8n/api-types';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AppVersionRepository } from '@/modules/apps/app-version.repository';
import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No auth and no `/rest` prefix: an App page is served at the instance root, to anyone. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;
let appVersionRepository: AppVersionRepository;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);
	appVersionRepository = Container.get(AppVersionRepository);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'AppVersion', 'Page']);
});

const createApp = async () => await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');

/** Freezes the app's current draft pages as the active version, like `POST .../publish` does. */
const publish = async (app: Awaited<ReturnType<typeof createApp>>) => {
	const pages = await pageRepository.findManyByAppId(app.id);
	const version = await appVersionRepository.createFromSnapshot(
		app.id,
		{
			pages: pages.map((page) => ({
				id: page.id,
				route: page.route,
				parentPageId: page.parentPageId,
				content: page.content as AppContent | null,
				layout: page.layout as AppLayout | null,
			})),
			theme: null,
			components: null,
		},
		owner.id,
	);
	await appRepository.setActiveVersionId(app, version.id);
};

describe('GET /apps/:namespace', () => {
	test('serves the index page of the active version without a session', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		await publish(app);

		const response = await visitor.get('/apps/acme').redirects(1).expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('Acme Portal');
	});

	test('serves the sandbox content security policy, as forms and webhooks do', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		await publish(app);

		const response = await visitor.get('/apps/acme').redirects(1).expect(200);

		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['content-security-policy']).not.toContain('allow-same-origin');
	});

	test('answers 404 for a namespace no App owns', async () => {
		const response = await visitor.get('/apps/nobody').expect(404);

		expect(response.text).toContain('Page not found');
	});

	test('answers "not published" for an App that has never been published', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme').redirects(1).expect(404);

		expect(response.text).toContain('This app has no published version yet');
	});

	test('does not serve a draft page added after publishing', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		await publish(app);
		await pageRepository.createPage(app.id, null, 'new-since-publish');

		await visitor.get('/apps/acme/new-since-publish').redirects(1).expect(404);
	});

	test('answers 404 for a path no page owns', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		await publish(app);

		await visitor.get('/apps/acme/nowhere').redirects(1).expect(404);
	});

	test('renders the menu as a nested list, mirroring the page tree', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, 'orders');
		await publish(app);

		const response = await visitor.get('/apps/acme/clients').redirects(1).expect(200);

		expect(response.text).toContain("href='/apps/acme'");
		expect(response.text).toContain("href='/apps/acme/clients/orders'");
		// One list for the top level and one for the children of `clients`: the
		// partial has to recurse to produce the second.
		expect(response.text.match(/<ul/g)?.length).toBeGreaterThanOrEqual(2);
	});

	test('escapes a param value where it reaches the page', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');
		await publish(app);

		// The value lands in the menu, both as a link label and inside an href.
		const response = await visitor
			.get(`/apps/acme/clients/${encodeURIComponent('"><script>alert(1)')}`)
			.redirects(1)
			.expect(200);

		expect(response.text).not.toContain('<script>alert(1)');
		expect(response.text).toContain('&lt;script&gt;alert(1)');
	});

	test('answers 404 for a param value carrying an encoded slash', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');
		await publish(app);

		// One segment cannot hold a path: the menu builds its own links from these
		// values, so a slash inside one would point somewhere else.
		await visitor.get('/apps/acme/clients/a%2Fb').redirects(1).expect(404);
	});

	test('encodes a param value back into the menu links', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		const detail = await pageRepository.createPage(app.id, clients.id, ':id');
		await pageRepository.createPage(app.id, detail.id, 'orders');
		await publish(app);

		const response = await visitor.get('/apps/acme/clients/a%20b').redirects(1).expect(200);

		expect(response.text).toContain("href='/apps/acme/clients/a%20b/orders'");
	});

	test('does not serve a page of another App', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, 'clients');
		await publish(app);
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		await pageRepository.createPage(other.id, null, 'secret');
		await publish(other);

		await visitor.get('/apps/acme/secret').redirects(1).expect(404);
	});

	test('renders a header block from the published snapshot', async () => {
		const app = await createApp();
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			content: [{ id: 'h1', type: 'header', data: { text: 'Welcome', level: 1 } }],
		});
		await publish(app);

		const response = await visitor.get('/apps/acme').redirects(1).expect(200);

		expect(response.text).toContain('Welcome');
	});

	test('sanitizes a script out of an html block', async () => {
		const app = await createApp();
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			content: [
				{
					id: 'html1',
					type: 'html',
					data: { template: '<p>hi</p><script>alert(1)</script>' },
				},
			],
		});
		await publish(app);

		const response = await visitor.get('/apps/acme').redirects(1).expect(200);

		expect(response.text).toContain('<p>hi</p>');
		expect(response.text).not.toContain('<script>alert(1)</script>');
	});
});

describe('GET /apps/:namespace with layouts', () => {
	const slot = { id: 'slot', type: 'slot', data: {} };
	const banner = (text: string) => ({ id: 'banner', type: 'header', data: { text, level: 2 } });

	test('renders the built-in shell when no page on the way up has a layout', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		await publish(app);

		const response = await visitor.get('/apps/acme').redirects(1).expect(200);

		expect(response.text).toContain("<div class='app-shell' data-app-root>");
		expect(response.text).not.toContain('app-layout');
	});

	test("a subpage inherits its parent's layout", async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.updatePage(clients, { layout: [banner('Parent banner'), slot] });
		await pageRepository.createPage(app.id, clients.id, 'orders', [
			{ id: 'h1', type: 'header', data: { text: 'Orders', level: 1 } },
		]);
		await publish(app);

		const response = await visitor.get('/apps/acme/clients/orders').redirects(1).expect(200);

		expect(response.text).toContain("<div class='app-layout' data-app-root>");
		expect(response.text).toContain('Parent banner');
		expect(response.text).toMatch(/<main class='app-main' data-app-slot>\s*<h1[^>]*>Orders/);
		expect(response.text).not.toContain('app-shell');
	});

	test('a page with its own layout does not inherit', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.updatePage(clients, { layout: [banner('Parent banner'), slot] });
		const orders = await pageRepository.createPage(app.id, clients.id, 'orders');
		await pageRepository.updatePage(orders, { layout: [banner('Own banner'), slot] });
		await publish(app);

		const response = await visitor.get('/apps/acme/clients/orders').redirects(1).expect(200);

		expect(response.text).toContain('Own banner');
		expect(response.text).not.toContain('Parent banner');
	});
});

describe('GET /apps/_static/app.css', () => {
	test('serves the compiled stylesheet without being shadowed by the namespace route', async () => {
		const response = await visitor.get('/apps/_static/app.css').expect(200);

		expect(response.headers['content-type']).toContain('css');
		expect(response.headers['cache-control']).toContain('max-age=86400');
	});
});
