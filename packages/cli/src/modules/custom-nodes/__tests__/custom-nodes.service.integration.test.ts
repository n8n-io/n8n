import type { CustomActionDraft, CreateCustomNodeDto } from '@n8n/api-types';
import { mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { createMember, createOwner } from '@test-integration/db/users';

import { CustomNodeConflictError } from '../custom-nodes.errors';
import { CustomNodesRegistry } from '../custom-nodes.registry';
import { CustomNodesService } from '../custom-nodes.service';
import { CustomActionRevisionEntity } from '../database/entities/custom-action-revision.entity';
import { CustomActionVersionEntity } from '../database/entities/custom-action-version.entity';
import { CustomActionEntity } from '../database/entities/custom-action.entity';
import { CustomNodeEntity } from '../database/entities/custom-node.entity';
import { InvalidCustomActionError } from '../draft-validator';

const registry = mockInstance(CustomNodesRegistry);

let service: CustomNodesService;
let owner: User;
let member: User;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pngUri = `data:image/png;base64,${PNG.toString('base64')}`;

const getInvoice = (): CustomActionDraft => ({
	name: 'Get Invoice',
	description: 'Reads one invoice',
	inputs: [
		{
			name: 'invoiceId',
			displayName: 'Invoice ID',
			type: 'string',
			required: true,
			target: 'url',
			key: 'invoiceId',
		},
	],
	request: {
		method: 'GET',
		url: '/invoices/{invoiceId}',
		headers: {},
		query: {},
		bodyType: 'none',
		body: {},
	},
});

const withQueryInput = (draft: CustomActionDraft, name: string): CustomActionDraft => ({
	...draft,
	inputs: [
		...draft.inputs,
		{ name, displayName: name, type: 'string', required: false, target: 'query', key: name },
	],
});

const newNode = (actions = [getInvoice()]): CreateCustomNodeDto => ({
	displayName: 'Acme Billing',
	description: 'Billing API',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'generic', type: 'httpHeaderAuth' },
	actions,
});

const countRows = async () => {
	const dataSource = Container.get(DataSource);
	return {
		nodes: await dataSource.getRepository(CustomNodeEntity).count(),
		actions: await dataSource.getRepository(CustomActionEntity).count(),
		versions: await dataSource.getRepository(CustomActionVersionEntity).count(),
		revisions: await dataSource.getRepository(CustomActionRevisionEntity).count(),
	};
};

/** Creates a node with one action and returns the ids. */
const createNodeWithAction = async () => {
	const node = await service.createNode(owner, newNode());
	registry.refresh.mockClear();
	return { nodeId: node.id, actionId: node.actions[0].id };
};

beforeAll(async () => {
	await testModules.loadModules(['custom-nodes'], {
		'custom-nodes': async () => await import('../custom-nodes.module.js'),
	});
	await testDb.init();
	service = Container.get(CustomNodesService);
	owner = await createOwner();
	member = await createMember();
});

beforeEach(() => {
	registry.refresh.mockReset();
	registry.refresh.mockResolvedValue(undefined);
});

afterEach(async () => {
	const dataSource = Container.get(DataSource);
	await dataSource.createQueryBuilder().delete().from(CustomActionEntity).execute();
	await dataSource.createQueryBuilder().delete().from(CustomNodeEntity).execute();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('CustomNodesService', () => {
	it('creates a node with its actions and returns nodeType n8n-custom.<id>', async () => {
		const node = await service.createNode(owner, newNode());

		expect(node.nodeType).toBe(`n8n-custom.${node.id}`);
		expect(node.id.endsWith('Tool')).toBe(false);
		expect(node).toMatchObject({
			displayName: 'Acme Billing',
			description: 'Billing API',
			baseUrl: 'https://billing.acme.test/api',
			auth: { kind: 'generic', type: 'httpHeaderAuth' },
			hasIcon: false,
		});
		expect(node.actions).toHaveLength(1);
		const [action] = node.actions;
		expect(action).toMatchObject({
			name: 'Get Invoice',
			description: 'Reads one invoice',
			customNodeId: node.id,
			parentNodeType: null,
			newestVersion: 1,
			draft: getInvoice(),
		});
		expect(action.versions).toEqual([
			{
				version: 1,
				currentRevision: 1,
				revisionCount: 1,
				createdAt: expect.any(String),
				pinValues: {
					operation: `${action.id}@1`,
					customActionId: action.id,
					customActionName: 'Get Invoice',
				},
			},
		]);
		expect(await service.list(owner)).toEqual([node]);
	});

	it('throws InvalidCustomActionError with issues and writes nothing for an invalid draft', async () => {
		const invalid: CustomActionDraft = {
			...getInvoice(),
			request: { ...getInvoice().request, headers: { Authorization: '={{ $credentials.key }}' } },
		};

		const error = await service.createNode(owner, newNode([invalid])).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(InvalidCustomActionError);
		expect((error as InvalidCustomActionError).issues).toEqual([
			expect.objectContaining({
				path: 'actions[0].request.headers.Authorization',
				code: 'expression_not_allowed',
			}),
		]);
		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });

		const { actionId, nodeId } = await createNodeWithAction();
		await expect(service.saveAction(owner, actionId, { draft: invalid })).rejects.toThrow(
			InvalidCustomActionError,
		);
		await expect(service.addAction(owner, nodeId, { draft: invalid })).rejects.toThrow(
			InvalidCustomActionError,
		);
		expect(await countRows()).toEqual({ nodes: 1, actions: 1, versions: 1, revisions: 1 });
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('rejects a base URL that is not http or https, on create and on update', async () => {
		await expect(
			service.createNode(owner, { ...newNode(), baseUrl: 'ftp://files.acme.test' }),
		).rejects.toThrow(UserError);
		const { nodeId } = await createNodeWithAction();
		await expect(
			service.updateNode(owner, nodeId, { baseUrl: 'https://{{ $env.HOST }}' }),
		).rejects.toThrow(UserError);
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('throws ForbiddenError for a member on every write method', async () => {
		const { nodeId, actionId } = await createNodeWithAction();
		const draft = { draft: getInvoice() };

		const writes = [
			async () => await service.createNode(member, newNode()),
			async () => await service.updateNode(member, nodeId, { displayName: 'Renamed' }),
			async () => await service.deleteNode(member, nodeId),
			async () => await service.setIcon(member, nodeId, pngUri),
			async () => await service.addAction(member, nodeId, draft),
			async () => await service.saveAction(member, actionId, draft),
			async () => await service.rollbackRevision(member, actionId, 1, 1),
			async () => await service.deleteAction(member, actionId),
		];
		for (const write of writes) {
			await expect(write()).rejects.toThrow(ForbiddenError);
		}
		expect(await countRows()).toEqual({ nodes: 1, actions: 1, versions: 1, revisions: 1 });
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('lets a member list', async () => {
		const { nodeId } = await createNodeWithAction();

		const nodes = await service.list(member);

		expect(nodes.map((n) => n.id)).toEqual([nodeId]);
		expect(service.preview(member, getInvoice()).issues).toEqual([]);
	});

	it('throws NotFoundError for an id that does not exist', async () => {
		await expect(service.updateNode(owner, 'missing', { displayName: 'X' })).rejects.toThrow(
			NotFoundError,
		);
		await expect(service.deleteNode(owner, 'missing')).rejects.toThrow(NotFoundError);
		await expect(service.setIcon(owner, 'missing', pngUri)).rejects.toThrow(NotFoundError);
		await expect(service.addAction(owner, 'missing', { draft: getInvoice() })).rejects.toThrow(
			NotFoundError,
		);
		await expect(service.saveAction(owner, 'missing', { draft: getInvoice() })).rejects.toThrow(
			NotFoundError,
		);
		await expect(service.rollbackRevision(owner, 'missing', 1, 1)).rejects.toThrow(NotFoundError);
		await expect(service.deleteAction(owner, 'missing')).rejects.toThrow(NotFoundError);
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('returns kind "none" and adds no row for an unchanged draft', async () => {
		const { actionId } = await createNodeWithAction();

		const { kind, action } = await service.saveAction(owner, actionId, { draft: getInvoice() });

		expect(kind).toBe('none');
		expect(action.newestVersion).toBe(1);
		expect(await countRows()).toEqual({ nodes: 1, actions: 1, versions: 1, revisions: 1 });
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('edits display names in place for a cosmetic change', async () => {
		const { actionId } = await createNodeWithAction();
		const draft = getInvoice();
		draft.name = 'Fetch Invoice';
		draft.inputs[0].displayName = 'Invoice number';

		const { kind, action } = await service.saveAction(owner, actionId, { draft });

		expect(kind).toBe('cosmetic');
		expect(action.newestVersion).toBe(1);
		expect(action.versions[0].revisionCount).toBe(1);
		expect(action.name).toBe('Fetch Invoice');
		expect(action.draft).toEqual(draft);
		expect(action.versions[0].pinValues.customActionName).toBe('Fetch Invoice');
	});

	it('appends a revision for a request change', async () => {
		const { actionId } = await createNodeWithAction();
		const draft = getInvoice();
		draft.request.headers = { Accept: 'application/json' };
		draft.inputs[0].displayName = 'Invoice number';

		const { kind, action } = await service.saveAction(owner, actionId, {
			draft,
			changeNote: 'Ask for JSON',
		});

		expect(kind).toBe('revision');
		expect(action.newestVersion).toBe(1);
		expect(action.versions[0]).toMatchObject({ currentRevision: 2, revisionCount: 2 });
		expect(action.draft).toEqual(draft);
		const revision = await Container.get(DataSource)
			.getRepository(CustomActionRevisionEntity)
			.findOneByOrFail({ revision: 2 });
		expect(revision).toMatchObject({ changeNote: 'Ask for JSON', createdById: owner.id });
	});

	it('appends a version for an input change and keeps version 1 readable', async () => {
		const { actionId } = await createNodeWithAction();
		const draft = withQueryInput(getInvoice(), 'expand');

		const { kind, action } = await service.saveAction(owner, actionId, { draft });

		expect(kind).toBe('version');
		expect(action.newestVersion).toBe(2);
		expect(action.versions).toHaveLength(2);
		expect(action.versions.map((v) => v.pinValues.operation)).toEqual([
			`${actionId}@1`,
			`${actionId}@2`,
		]);
		expect(action.versions[1]).toMatchObject({ currentRevision: 1, revisionCount: 1 });
		expect(action.draft).toEqual(draft);
		const rows = await Container.get(DataSource)
			.getRepository(CustomActionVersionEntity)
			.find({ where: { actionId }, order: { version: 'ASC' } });
		expect(rows.map((r) => r.inputs.map((i) => i.name))).toEqual([
			['invoiceId'],
			['invoiceId', 'expand'],
		]);
	});

	it('rolls back to an earlier revision', async () => {
		const { actionId } = await createNodeWithAction();
		const draft = getInvoice();
		draft.request.headers = { Accept: 'application/json' };
		await service.saveAction(owner, actionId, { draft });
		registry.refresh.mockClear();

		const action = await service.rollbackRevision(owner, actionId, 1, 1);

		expect(action.versions[0]).toMatchObject({ currentRevision: 1, revisionCount: 2 });
		expect(action.draft).toEqual(getInvoice());
		expect(registry.refresh).toHaveBeenCalledTimes(1);
	});

	it('rejects a rollback to a revision that does not exist', async () => {
		const { actionId } = await createNodeWithAction();

		await expect(service.rollbackRevision(owner, actionId, 1, 2)).rejects.toThrow(NotFoundError);
		await expect(service.rollbackRevision(owner, actionId, 2, 1)).rejects.toThrow(NotFoundError);
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('records the old base URL in the history', async () => {
		const { nodeId } = await createNodeWithAction();

		const node = await service.updateNode(owner, nodeId, {
			baseUrl: 'https://billing-v2.acme.test/api',
			displayName: 'Acme Billing v2',
		});

		expect(node).toMatchObject({
			baseUrl: 'https://billing-v2.acme.test/api',
			displayName: 'Acme Billing v2',
		});
		const row = await Container.get(DataSource)
			.getRepository(CustomNodeEntity)
			.findOneByOrFail({ id: nodeId });
		expect(row.baseUrlHistory).toEqual([
			{
				baseUrl: 'https://billing.acme.test/api',
				changedAt: expect.any(String),
				changedById: owner.id,
			},
		]);
		expect(row.updatedById).toBe(owner.id);
	});

	it('does nothing for an empty update', async () => {
		const { nodeId } = await createNodeWithAction();
		const before = await service.list(owner);

		const node = await service.updateNode(owner, nodeId, {});

		expect(node).toEqual(before[0]);
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('refuses to delete the last action of a node', async () => {
		const { nodeId, actionId } = await createNodeWithAction();

		await expect(service.deleteAction(owner, actionId)).rejects.toThrow(UserError);
		expect(await countRows()).toMatchObject({ actions: 1 });

		const second = await service.addAction(owner, nodeId, {
			draft: { ...getInvoice(), name: 'Get Invoice PDF' },
		});
		await service.deleteAction(owner, actionId);
		const [node] = await service.list(owner);
		expect(node.actions.map((a) => a.id)).toEqual([second.id]);
	});

	it('deletes a node with its actions', async () => {
		const { nodeId } = await createNodeWithAction();

		await service.deleteNode(owner, nodeId);

		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });
	});

	it('stores and returns the icon', async () => {
		const { nodeId } = await createNodeWithAction();
		await expect(service.getIcon(nodeId)).rejects.toThrow(NotFoundError);

		await service.setIcon(owner, nodeId, pngUri);

		expect(await service.getIcon(nodeId)).toEqual({ mimeType: 'image/png', data: PNG });
		expect((await service.list(owner))[0].hasIcon).toBe(true);
		await expect(service.setIcon(owner, nodeId, 'data:image/png;base64,AAAA')).rejects.toThrow(
			UserError,
		);
	});

	it('returns the input properties of a valid draft in the preview', () => {
		const preview = service.preview(owner, withQueryInput(getInvoice(), 'expand'));

		expect(preview.issues).toEqual([]);
		expect(preview.properties.map((p) => p.name)).toEqual(['invoiceId', 'additionalFields']);
	});

	it('returns the issues and no properties for an invalid draft in the preview', () => {
		const draft = getInvoice();
		draft.request.url = '/invoices/{other}';

		const preview = service.preview(owner, draft);

		expect(preview.issues.length).toBeGreaterThan(0);
		expect(preview.properties).toEqual([]);
	});

	it('refreshes the registry once after each write', async () => {
		const expectOneRefresh = () => {
			expect(registry.refresh).toHaveBeenCalledTimes(1);
			expect(registry.refresh).toHaveBeenCalledWith({ notifyEditors: true, notifyInstances: true });
			registry.refresh.mockClear();
		};

		const node = await service.createNode(owner, newNode());
		expectOneRefresh();
		const actionId = node.actions[0].id;
		await service.updateNode(owner, node.id, { displayName: 'Renamed' });
		expectOneRefresh();
		await service.setIcon(owner, node.id, pngUri);
		expectOneRefresh();
		const added = await service.addAction(owner, node.id, {
			draft: { ...getInvoice(), name: 'Second' },
		});
		expectOneRefresh();
		await service.saveAction(owner, actionId, { draft: withQueryInput(getInvoice(), 'expand') });
		expectOneRefresh();
		await service.rollbackRevision(owner, actionId, 1, 1);
		expectOneRefresh();
		await service.deleteAction(owner, added.id);
		expectOneRefresh();
		await service.deleteNode(owner, node.id);
		expectOneRefresh();
	});

	it('gives two concurrent version edits the numbers 2 and 3', async () => {
		const { actionId } = await createNodeWithAction();
		const editA = { draft: withQueryInput(getInvoice(), 'expand') };
		const editB = { draft: withQueryInput(getInvoice(), 'limit') };

		const results = await Promise.allSettled([
			service.saveAction(owner, actionId, editA),
			service.saveAction(owner, actionId, editB),
		]);

		const fulfilled = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
		const rejected = results.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
		for (const reason of rejected) expect(reason).toBeInstanceOf(CustomNodeConflictError);
		for (const result of fulfilled) expect(result.kind).toBe('version');
		const rows = await Container.get(DataSource)
			.getRepository(CustomActionVersionEntity)
			.find({ where: { actionId }, order: { version: 'ASC' } });
		expect(rows.map((r) => r.version)).toEqual(rejected.length === 0 ? [1, 2, 3] : [1, 2]);
		// Each edit created its own version. The response reads the state after both commits.
		const addedInputs = rows.slice(1).map((r) => r.inputs.at(-1)?.name);
		if (rejected.length === 0) expect(addedInputs.sort()).toEqual(['expand', 'limit']);
	});
});
