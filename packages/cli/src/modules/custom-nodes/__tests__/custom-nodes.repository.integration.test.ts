import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, EntityManager } from '@n8n/typeorm';

import { createOwner } from '@test-integration/db/users';

import { CustomNodeConflictError } from '../custom-nodes.errors';
import { CustomActionRevisionEntity } from '../database/entities/custom-action-revision.entity';
import { CustomActionVersionEntity } from '../database/entities/custom-action-version.entity';
import { CustomActionEntity } from '../database/entities/custom-action.entity';
import { CustomNodeEntity } from '../database/entities/custom-node.entity';
import {
	CustomActionRepository,
	type NewCustomAction,
} from '../database/repositories/custom-action.repository';
import {
	CustomNodeRepository,
	type NewCustomNode,
} from '../database/repositories/custom-node.repository';
import type { StoredInput, StoredRequest } from '../edit-classifier';

let nodes: CustomNodeRepository;
let actions: CustomActionRepository;
let txRunner: TransactionRunner;
let ownerId: string;

const inputs: StoredInput[] = [
	{ name: 'invoiceId', displayName: 'Invoice ID', type: 'string', required: true },
];

const request = (url = '/invoices/{invoiceId}'): StoredRequest => ({
	method: 'GET',
	url,
	headers: {},
	query: {},
	bodyType: 'none',
	body: {},
	inputTargets: { invoiceId: { target: 'url', key: 'invoiceId' } },
});

const newNode = (): NewCustomNode => ({
	displayName: 'Acme Billing',
	description: 'Billing API',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'generic', type: 'httpHeaderAuth' },
	createdById: ownerId,
});

const parentAction = (): NewCustomAction => ({
	name: 'Get Invoice',
	parentNodeType: 'n8n-nodes-base.httpRequest',
	customNodeId: null,
	createdById: ownerId,
});

const revision = (url?: string) => ({ request: request(url), createdById: ownerId });

const countRows = async () => {
	const dataSource = Container.get(DataSource);
	return {
		nodes: await dataSource.getRepository(CustomNodeEntity).count(),
		actions: await dataSource.getRepository(CustomActionEntity).count(),
		versions: await dataSource.getRepository(CustomActionVersionEntity).count(),
		revisions: await dataSource.getRepository(CustomActionRevisionEntity).count(),
	};
};

beforeAll(async () => {
	await testModules.loadModules(['custom-nodes'], {
		'custom-nodes': async () => await import('../custom-nodes.module.js'),
	});
	await testDb.init();
	nodes = Container.get(CustomNodeRepository);
	actions = Container.get(CustomActionRepository);
	txRunner = Container.get(TransactionRunner);
	ownerId = (await createOwner()).id;
});

afterEach(async () => {
	// Deleting the parents cascades to versions and revisions.
	const dataSource = Container.get(DataSource);
	await dataSource.createQueryBuilder().delete().from(CustomActionEntity).execute();
	await dataSource.createQueryBuilder().delete().from(CustomNodeEntity).execute();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('CustomActionRepository', () => {
	it('stores an action with version 1 and revision 1', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});

		const aggregate = await actions.findAction(id, {});

		expect(aggregate?.action).toMatchObject({
			id,
			name: 'Get Invoice',
			parentNodeType: 'n8n-nodes-base.httpRequest',
			customNodeId: null,
		});
		expect(aggregate?.versions).toHaveLength(1);
		expect(aggregate?.versions[0]).toMatchObject({
			version: 1,
			currentRevision: 1,
			revisionCount: 1,
			inputs,
			request: request(),
		});
		expect(aggregate?.versions[0].createdAt).toBeInstanceOf(Date);
		expect(await actions.findAction('missing', {})).toBeNull();
	});

	it('numbers versions 1, 2, 3 for one action', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});

		expect(await actions.appendVersion(id, { inputs }, revision('/v2'), {})).toBe(2);
		expect(await actions.appendVersion(id, { inputs }, revision('/v3'), {})).toBe(3);

		const aggregate = await actions.findAction(id, {});
		expect(aggregate?.versions.map((v) => v.version)).toEqual([1, 2, 3]);
		expect(aggregate?.versions.map((v) => v.request.url)).toEqual([
			'/invoices/{invoiceId}',
			'/v2',
			'/v3',
		]);
		expect(aggregate?.versions.every((v) => v.currentRevision === 1)).toBe(true);
	});

	it('numbers revisions per version', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});
		const v1 = (await actions.findAction(id, {}))!.versions[0].id;

		expect(await actions.appendRevision(v1, revision('/r2'), {})).toBe(2);
		expect(await actions.appendRevision(v1, revision('/r3'), {})).toBe(3);
		expect(await actions.appendVersion(id, { inputs }, revision('/v2'), {})).toBe(2);

		const [first, second] = (await actions.findAction(id, {}))!.versions;
		expect(first).toMatchObject({ currentRevision: 3, revisionCount: 3 });
		expect(first.request.url).toBe('/r3');
		expect(second).toMatchObject({ version: 2, currentRevision: 1, revisionCount: 1 });
		expect(await actions.countRevisions(v1, {})).toBe(3);
		expect(await actions.countRevisions(second.id, {})).toBe(1);
	});

	it('throws CustomNodeConflictError when the next version number is taken', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});
		// A stale maximum makes the append reuse version 1, as a concurrent append would.
		const maximum = vi.spyOn(EntityManager.prototype, 'maximum').mockResolvedValueOnce(0);

		await expect(actions.appendVersion(id, { inputs }, revision('/v2'), {})).rejects.toThrow(
			CustomNodeConflictError,
		);
		maximum.mockRestore();
		expect(await countRows()).toMatchObject({ versions: 1, revisions: 1 });
	});

	it('throws CustomNodeConflictError when the next revision number is taken', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});
		const versionId = (await actions.findAction(id, {}))!.versions[0].id;
		const maximum = vi.spyOn(EntityManager.prototype, 'maximum').mockResolvedValueOnce(0);

		await expect(actions.appendRevision(versionId, revision('/r2'), {})).rejects.toThrow(
			CustomNodeConflictError,
		);
		maximum.mockRestore();
		expect(await countRows()).toMatchObject({ versions: 1, revisions: 1 });
	});

	it('locks an action or a node row and reports whether it exists', async () => {
		const node = await nodes.insertNode(newNode(), {});
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});

		await txRunner.run({}, async (ctx) => {
			expect(await actions.lockAction(id, ctx)).toBe(true);
			expect(await actions.lockAction('missing', ctx)).toBe(false);
			expect(await nodes.lockNode(node.id, ctx)).toBe(true);
			expect(await nodes.lockNode('missing', ctx)).toBe(false);
		});
	});

	it('counts the actions of a custom node', async () => {
		const node = await nodes.insertNode(newNode(), {});
		const own = { ...parentAction(), parentNodeType: null, customNodeId: node.id };
		await actions.insertAction(own, { inputs }, revision(), {});
		await actions.insertAction(own, { inputs }, revision(), {});
		await actions.insertAction(parentAction(), { inputs }, revision(), {});

		expect(await actions.countActionsOfNode(node.id, {})).toBe(2);
	});

	it('rejects an action with both parentNodeType and customNodeId', async () => {
		const node = await nodes.insertNode(newNode(), {});

		await expect(
			actions.insertAction(
				{ ...parentAction(), customNodeId: node.id },
				{ inputs },
				revision(),
				{},
			),
		).rejects.toThrow(/custom_action_parent/);
		expect((await countRows()).actions).toBe(0);
	});

	it('rejects an action with neither', async () => {
		await expect(
			actions.insertAction({ ...parentAction(), parentNodeType: null }, { inputs }, revision(), {}),
		).rejects.toThrow(/custom_action_parent/);
		expect((await countRows()).actions).toBe(0);
	});

	it('deletes actions, versions and revisions with their custom node', async () => {
		const node = await nodes.insertNode(newNode(), {});
		const id = await actions.insertAction(
			{ ...parentAction(), parentNodeType: null, customNodeId: node.id },
			{ inputs },
			revision(),
			{},
		);
		await actions.appendVersion(id, { inputs }, revision('/v2'), {});
		expect(await countRows()).toEqual({ nodes: 1, actions: 1, versions: 2, revisions: 2 });

		await nodes.deleteNode(node.id, {});

		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });
	});

	it('rolls back all rows when the transaction fails', async () => {
		await expect(
			txRunner.run({}, async (ctx) => {
				const node = await nodes.insertNode(newNode(), ctx);
				const id = await actions.insertAction(
					{ ...parentAction(), parentNodeType: null, customNodeId: node.id },
					{ inputs },
					revision(),
					ctx,
				);
				await actions.appendVersion(id, { inputs }, revision('/v2'), ctx);
				throw new Error('Fail after the inserts');
			}),
		).rejects.toThrow('Fail after the inserts');

		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });
	});

	it('updates metadata, inputs and the current revision in place', async () => {
		const id = await actions.insertAction(parentAction(), { inputs }, revision(), {});
		const versionId = (await actions.findAction(id, {}))!.versions[0].id;
		await actions.appendRevision(versionId, revision('/r2'), {});

		const renamed: StoredInput[] = [{ ...inputs[0], displayName: 'Invoice number' }];
		await actions.updateActionMeta(
			id,
			{ name: 'Fetch Invoice', description: 'Reads one invoice', updatedById: ownerId },
			{},
		);
		await actions.updateVersionInputs(versionId, renamed, {});
		await actions.setCurrentRevision(versionId, 1, {});

		const aggregate = await actions.findAction(id, {});
		expect(aggregate?.action).toMatchObject({
			name: 'Fetch Invoice',
			description: 'Reads one invoice',
			updatedById: ownerId,
		});
		expect(aggregate?.versions[0]).toMatchObject({
			inputs: renamed,
			currentRevision: 1,
			revisionCount: 2,
		});
		expect(aggregate?.versions[0].request.url).toBe('/invoices/{invoiceId}');
	});

	it('lists all actions with their versions', async () => {
		const first = await actions.insertAction(parentAction(), { inputs }, revision(), {});
		const second = await actions.insertAction(
			{ ...parentAction(), name: 'List Invoices' },
			{ inputs: [] },
			revision('/invoices'),
			{},
		);
		await actions.appendVersion(second, { inputs }, revision('/v2'), {});

		const all = await actions.findAllActions({});

		expect(all.map((a) => [a.action.id, a.versions.length])).toEqual(
			expect.arrayContaining([
				[first, 1],
				[second, 2],
			]),
		);
		expect(all).toHaveLength(2);

		await actions.deleteAction(first, {});
		expect((await actions.findAllActions({})).map((a) => a.action.id)).toEqual([second]);
		expect(await countRows()).toMatchObject({ actions: 1, versions: 2, revisions: 2 });
	});
});

describe('CustomNodeRepository', () => {
	it('lists nodes without the icon data but tells whether an icon exists', async () => {
		const node = await nodes.insertNode(newNode(), {});
		expect(node.id).toHaveLength(16);
		expect(node.baseUrlHistory).toEqual([]);

		await nodes.setIcon(node.id, { mimeType: 'image/png', data: Buffer.from([1, 2, 3]) }, {});

		const [listed] = await nodes.findAllNodes({});
		expect(listed).toMatchObject({ id: node.id, iconMimeType: 'image/png' });
		expect(listed.iconData).toBeUndefined();
		expect(await nodes.findIcon(node.id, {})).toEqual({
			mimeType: 'image/png',
			data: Buffer.from([1, 2, 3]),
		});

		await nodes.setIcon(node.id, null, {});
		expect(await nodes.findIcon(node.id, {})).toBeNull();
		expect((await nodes.findNode(node.id, {}))?.iconMimeType).toBeNull();
	});

	it('updates a node and keeps the base URL history', async () => {
		const node = await nodes.insertNode(newNode(), {});
		const history = [
			{ baseUrl: node.baseUrl, changedAt: new Date().toISOString(), changedById: ownerId },
		];

		await nodes.updateNode(
			node.id,
			{ baseUrl: 'https://billing.acme.test/v2', baseUrlHistory: history, updatedById: ownerId },
			{},
		);

		expect(await nodes.findNode(node.id, {})).toMatchObject({
			displayName: 'Acme Billing',
			baseUrl: 'https://billing.acme.test/v2',
			baseUrlHistory: history,
			auth: { kind: 'generic', type: 'httpHeaderAuth' },
			updatedById: ownerId,
		});
		expect(await nodes.findNode('missing', {})).toBeNull();
	});
});
