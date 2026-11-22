import type { CustomActionDraft, CreateCustomNodeDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { DataSource, In } from '@n8n/typeorm';
import type { MockInstance } from 'vitest';

import { CredentialTypes } from '@/credential-types';
import { createMember, createOwner } from '@test-integration/db/users';

import { CustomNodeConflictError } from '../custom-nodes.errors';
import { CustomNodesRegistry } from '../custom-nodes.registry';
import { CustomNodesService } from '../custom-nodes.service';
import { ParentActionsProvider } from '../parent-actions.provider';
import { parentPinValues } from '../parent-action.generator';
import { CustomActionRevisionEntity } from '../database/entities/custom-action-revision.entity';
import { CustomActionVersionEntity } from '../database/entities/custom-action-version.entity';
import { CustomActionEntity } from '../database/entities/custom-action.entity';
import { CustomNodeEntity } from '../database/entities/custom-node.entity';
import { InvalidCustomActionError } from '../draft-validator';

const registry = mockInstance(CustomNodesRegistry);
const credentialTypes = mockInstance(CredentialTypes);

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
	credentialTypes.recognizes.mockImplementation((type) => type === 'acmeApi');
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
			request: { ...getInvoice().request, headers: { Authorization: '={{ $json.key }}' } },
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

	it('checks each draft against the draft schema, also without the controller', async () => {
		const tooLong = getInvoice();
		tooLong.request.url = `/invoices/{invoiceId}/${'x'.repeat(2048)}`;
		const badName = getInvoice();
		badName.inputs[0].name = 'Invoice-Id';

		const error = await service.createNode(owner, newNode([tooLong])).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(InvalidCustomActionError);
		expect((error as InvalidCustomActionError).issues).toEqual([
			expect.objectContaining({ path: 'actions[0].request.url' }),
		]);
		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });

		const { nodeId, actionId } = await createNodeWithAction();
		const addError = await service
			.addAction(owner, nodeId, { draft: badName })
			.catch((e: unknown) => e);
		expect((addError as InvalidCustomActionError).issues).toEqual([
			expect.objectContaining({ path: 'inputs[0].name' }),
		]);
		await expect(service.saveAction(owner, actionId, { draft: tooLong })).rejects.toThrow(
			InvalidCustomActionError,
		);
		expect(service.preview(owner, badName).issues).toEqual([
			expect.objectContaining({ path: 'inputs[0].name' }),
		]);
		expect(await countRows()).toEqual({ nodes: 1, actions: 1, versions: 1, revisions: 1 });
	});

	it('accepts a predefined credential type that the instance knows and rejects another', async () => {
		const withAuth = (credentialType: string): CreateCustomNodeDto => ({
			...newNode(),
			auth: { kind: 'predefined', credentialType },
		});

		await expect(service.createNode(owner, withAuth('unknownApi'))).rejects.toThrow(UserError);
		expect(await countRows()).toMatchObject({ nodes: 0 });

		const node = await service.createNode(owner, withAuth('acmeApi'));
		expect(node.auth).toEqual({ kind: 'predefined', credentialType: 'acmeApi' });
	});

	it('rejects a node without actions and writes nothing', async () => {
		await expect(service.createNode(owner, newNode([]))).rejects.toThrow(UserError);

		expect(await countRows()).toEqual({ nodes: 0, actions: 0, versions: 0, revisions: 0 });
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

	it('throws ForbiddenError, not NotFoundError, for a member and an id that does not exist', async () => {
		const draft = { draft: getInvoice() };
		const writes = [
			async () => await service.updateNode(member, 'missing', { displayName: 'Renamed' }),
			async () => await service.deleteNode(member, 'missing'),
			async () => await service.setIcon(member, 'missing', pngUri),
			async () => await service.addAction(member, 'missing', draft),
			async () => await service.saveAction(member, 'missing', draft),
			async () => await service.rollbackRevision(member, 'missing', 1, 1),
			async () => await service.deleteAction(member, 'missing'),
		];
		for (const write of writes) {
			await expect(write()).rejects.toThrow(ForbiddenError);
		}
	});

	it('stores an empty description as no description on create', async () => {
		const node = await service.createNode(owner, { ...newNode(), description: '' });

		expect(node).not.toHaveProperty('description');
		const row = await Container.get(DataSource)
			.getRepository(CustomNodeEntity)
			.findOneByOrFail({ id: node.id });
		expect(row.description).toBeNull();
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

	describe('option order', () => {
		const optionsInput = (
			options: Array<{ name: string; value: string }>,
			defaultValue?: string,
		): CustomActionDraft['inputs'][number] => ({
			name: 'speed',
			displayName: 'Speed',
			type: 'options',
			options,
			required: false,
			...(defaultValue !== undefined && { default: defaultValue }),
			target: 'query',
			key: 'speed',
		});
		const fast = { name: 'Fast', value: 'fast' };
		const safe = { name: 'Safe', value: 'safe' };
		const slow = { name: 'Slow', value: 'slow' };
		const withSpeed = (input: CustomActionDraft['inputs'][number]): CustomActionDraft => ({
			...getInvoice(),
			inputs: [...getInvoice().inputs, input],
		});

		const createWith = async (draft: CustomActionDraft) => {
			const node = await service.createNode(owner, newNode([draft]));
			return node.actions[0].id;
		};

		it('appends a version when a reorder changes the first option of an input without a default', async () => {
			const actionId = await createWith(withSpeed(optionsInput([fast, safe])));
			const draft = withSpeed(optionsInput([safe, fast]));
			draft.request.headers = { Accept: 'application/json' };

			const { kind, action } = await service.saveAction(owner, actionId, { draft });

			expect(kind).toBe('version');
			expect(action.newestVersion).toBe(2);
			const rows = await Container.get(DataSource)
				.getRepository(CustomActionVersionEntity)
				.find({ where: { actionId }, order: { version: 'ASC' } });
			expect(rows[0].inputs[1].options?.map((o) => o.value)).toEqual(['fast', 'safe']);
		});

		it.each([
			['an explicit default', [fast, safe], [safe, fast], 'fast'],
			['the same first option', [fast, safe, slow], [fast, slow, safe], undefined],
		])(
			'stores a reorder in place as cosmetic for an input with %s',
			async (_case, before, after, defaultValue) => {
				const actionId = await createWith(withSpeed(optionsInput(before, defaultValue)));
				const draft = withSpeed(optionsInput(after, defaultValue));

				const { kind, action } = await service.saveAction(owner, actionId, { draft });

				expect(kind).toBe('cosmetic');
				expect(action.newestVersion).toBe(1);
				expect(action.draft).toEqual(draft);
			},
		);
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
		await expect(service.getIcon(owner, nodeId)).rejects.toThrow(NotFoundError);

		await service.setIcon(owner, nodeId, pngUri);

		expect(await service.getIcon(owner, nodeId)).toEqual({ mimeType: 'image/png', data: PNG });
		expect(await service.getIcon(member, nodeId)).toEqual({ mimeType: 'image/png', data: PNG });
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

	it('throws ForbiddenError for the icon of a user without the list scope', async () => {
		const { nodeId } = await createNodeWithAction();
		await service.setIcon(owner, nodeId, pngUri);
		const withoutScope = { ...member, role: { ...member.role, scopes: [] } } as unknown as User;

		await expect(service.getIcon(withoutScope, nodeId)).rejects.toThrow(ForbiddenError);
	});

	it('resolves a write and logs the node id when the registry refresh fails after the commit', async () => {
		const loggerError = vi.spyOn(Logger.prototype, 'error');
		registry.refresh.mockRejectedValue(new Error('refresh failed'));

		const node = await service.createNode(owner, newNode());
		await service.updateNode(owner, node.id, { displayName: 'Renamed' });
		const added = await service.addAction(owner, node.id, {
			draft: { ...getInvoice(), name: 'Second' },
		});
		const { kind } = await service.saveAction(owner, added.id, {
			draft: { ...getInvoice(), name: 'Third' },
		});

		expect(kind).toBe('cosmetic');
		expect(await countRows()).toEqual({ nodes: 1, actions: 2, versions: 2, revisions: 2 });
		expect(registry.refresh).toHaveBeenCalledTimes(4);
		expect(loggerError).toHaveBeenCalledTimes(4);
		expect(loggerError).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ nodeId: node.id }),
		);
		expect(loggerError).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ actionId: added.id }),
		);
		expect(JSON.stringify(loggerError.mock.calls)).not.toContain('/invoices/');
		loggerError.mockRestore();
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

	it('classifies a concurrent request change against the newest state', async () => {
		const { actionId } = await createNodeWithAction();
		const inputChange = { draft: withQueryInput(getInvoice(), 'expand') };
		const requestDraft = getInvoice();
		requestDraft.request.headers = { Accept: 'application/json' };

		const results = await Promise.allSettled([
			service.saveAction(owner, actionId, inputChange),
			service.saveAction(owner, actionId, { draft: requestDraft }),
		]);

		for (const result of results) {
			if (result.status === 'rejected')
				expect(result.reason).toBeInstanceOf(CustomNodeConflictError);
		}
		const dataSource = Container.get(DataSource);
		const versions = await dataSource
			.getRepository(CustomActionVersionEntity)
			.find({ where: { actionId }, order: { version: 'ASC' } });
		const revisions = await dataSource
			.getRepository(CustomActionRevisionEntity)
			.find({ where: { versionId: In(versions.map((v) => v.id)) }, order: { id: 'ASC' } });
		const [v1, v2] = versions;
		const v1Revision2 = revisions.find((r) => r.versionId === v1.id && r.revision === 2);
		const v2Revision1 = revisions.find((r) => r.versionId === v2?.id && r.revision === 1);

		if (results[1].status === 'fulfilled') {
			if (v1Revision2) {
				// The request change ran first, so the input change was classified after it.
				expect(v2Revision1 && v1Revision2.id < v2Revision1.id).toBe(true);
			} else {
				// The input change ran first. The request change then made the newest version.
				const newest = versions.at(-1)!;
				const newestRequest = revisions.find(
					(r) => r.versionId === newest.id && r.revision === newest.currentRevision,
				);
				expect(newest.version).toBeGreaterThan(1);
				expect(newestRequest?.request.headers).toEqual({ Accept: 'application/json' });
			}
		} else {
			expect(v1Revision2).toBeUndefined();
		}
	});

	it('keeps one action when the last two actions are deleted at the same time', async () => {
		const { nodeId, actionId } = await createNodeWithAction();
		const second = await service.addAction(owner, nodeId, {
			draft: { ...getInvoice(), name: 'Get Invoice PDF' },
		});

		const results = await Promise.allSettled([
			service.deleteAction(owner, actionId),
			service.deleteAction(owner, second.id),
		]);

		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
		expect(rejected).toHaveLength(1);
		expect(rejected[0]).toBeInstanceOf(UserError);
		expect(rejected[0]).not.toBeInstanceOf(NotFoundError);
		expect(await countRows()).toMatchObject({ nodes: 1, actions: 1 });
	});
});

describe('parent actions', () => {
	const RESOURCE_PARENT = 'n8n-nodes-base.stripe';
	const OPERATION_PARENT = 'n8n-nodes-base.acmeParent';
	const UNKNOWN_PARENT = 'n8n-nodes-base.notEligible';

	const parentInvoice = (): CustomActionDraft => {
		const draft = getInvoice();
		return {
			...draft,
			request: { ...draft.request, url: 'https://billing.acme.test/api/invoices/{invoiceId}' },
		};
	};

	let provider: ParentActionsProvider;
	let shapeOf: MockInstance<ParentActionsProvider['shapeOf']>;
	let eligibleParents: MockInstance<ParentActionsProvider['eligibleParents']>;
	let available: Set<string>;

	beforeEach(() => {
		provider = Container.get(ParentActionsProvider);
		available = new Set([RESOURCE_PARENT, OPERATION_PARENT]);
		shapeOf = vi.spyOn(provider, 'shapeOf').mockImplementation((name) => {
			if (!available.has(name)) return undefined;
			return name === RESOURCE_PARENT ? 'resource' : 'operation';
		});
		eligibleParents = vi.spyOn(provider, 'eligibleParents').mockReturnValue([
			{ nodeType: RESOURCE_PARENT, shape: 'resource' },
			{ nodeType: OPERATION_PARENT, shape: 'operation' },
		]);
	});

	afterEach(() => {
		shapeOf.mockRestore();
		eligibleParents.mockRestore();
	});

	const addParent = async (parentNodeType = RESOURCE_PARENT, draft = parentInvoice()) => {
		const action = await service.addParentAction(owner, { parentNodeType, draft });
		registry.refresh.mockClear();
		return action;
	};

	it('creates an action for an eligible parent and returns pin values with the resource', async () => {
		const action = await service.addParentAction(owner, {
			parentNodeType: RESOURCE_PARENT,
			draft: parentInvoice(),
			changeNote: 'First version',
		});

		expect(action).toMatchObject({
			name: 'Get Invoice',
			parentNodeType: RESOURCE_PARENT,
			customNodeId: null,
			newestVersion: 1,
			parentAvailable: true,
		});
		const ref = { actionId: action.id, actionName: 'Get Invoice', version: 1 };
		expect(action.versions[0].pinValues).toEqual(parentPinValues('resource', ref));
		expect(action.versions[0].pinValues).toHaveProperty('resource');
	});

	it('returns pin values without a resource for a parent without resource', async () => {
		const action = await service.addParentAction(owner, {
			parentNodeType: OPERATION_PARENT,
			draft: parentInvoice(),
		});

		const ref = { actionId: action.id, actionName: 'Get Invoice', version: 1 };
		expect(action.versions[0].pinValues).toEqual(parentPinValues('operation', ref));
		expect(action.versions[0].pinValues).not.toHaveProperty('resource');
	});

	it('rejects a node type that is not eligible', async () => {
		const error = await service
			.addParentAction(owner, { parentNodeType: UNKNOWN_PARENT, draft: parentInvoice() })
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UserError);
		expect((error as Error).message).toBe(
			`Custom actions are not available for the node type "${UNKNOWN_PARENT}".`,
		);
		expect(await countRows()).toMatchObject({ actions: 0 });
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('rejects a draft with a relative URL', async () => {
		const error = await service
			.addParentAction(owner, { parentNodeType: RESOURCE_PARENT, draft: getInvoice() })
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(InvalidCustomActionError);
		expect((error as InvalidCustomActionError).issues).toEqual([
			expect.objectContaining({ path: 'request.url', code: 'absolute_url_required' }),
		]);
		expect(await countRows()).toMatchObject({ actions: 0 });
	});

	it('rejects a draft with an expression', async () => {
		const draft = parentInvoice();
		const withExpression: CustomActionDraft = {
			...draft,
			request: { ...draft.request, query: { q: '{{ $json.x }}' } },
		};

		await expect(
			service.addParentAction(owner, { parentNodeType: RESOURCE_PARENT, draft: withExpression }),
		).rejects.toBeInstanceOf(InvalidCustomActionError);
		expect(await countRows()).toMatchObject({ actions: 0 });
	});

	it('rejects a save that makes the URL of a parent action relative', async () => {
		const action = await addParent();

		const error = await service
			.saveAction(owner, action.id, { draft: getInvoice() })
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(InvalidCustomActionError);
		expect((error as InvalidCustomActionError).issues).toEqual([
			expect.objectContaining({ code: 'absolute_url_required' }),
		]);
		expect(registry.refresh).not.toHaveBeenCalled();
	});

	it('saves a change of the inputs as a new version', async () => {
		const action = await addParent();

		const { action: saved, kind } = await service.saveAction(owner, action.id, {
			draft: withQueryInput(parentInvoice(), 'expand'),
		});

		expect(kind).toBe('version');
		expect(saved.newestVersion).toBe(2);
		expect(saved.versions).toHaveLength(2);
		const ref = { actionId: action.id, actionName: 'Get Invoice', version: 2 };
		expect(saved.versions[1].pinValues).toEqual(parentPinValues('resource', ref));
		expect(registry.refresh).toHaveBeenCalledTimes(1);
	});

	it('uses the pin values of the parent in the result of a rollback', async () => {
		const action = await addParent();

		const rolled = await service.rollbackRevision(owner, action.id, 1, 1);

		const ref = { actionId: action.id, actionName: 'Get Invoice', version: 1 };
		expect(rolled.versions[0].pinValues).toEqual(parentPinValues('resource', ref));
	});

	it('deletes the only action of a parent', async () => {
		const action = await addParent();

		await service.deleteAction(owner, action.id);

		expect(await countRows()).toMatchObject({ actions: 0 });
		expect(registry.refresh).toHaveBeenCalledTimes(1);
	});

	it('lists parent actions and marks a parent that is not available', async () => {
		const first = await addParent(RESOURCE_PARENT);
		const second = await addParent(OPERATION_PARENT, { ...parentInvoice(), name: 'Other' });
		available.delete(OPERATION_PARENT);

		const list = await service.listParentActions(member);

		expect(list.map((a) => [a.id, a.parentAvailable])).toEqual(
			expect.arrayContaining([
				[first.id, true],
				[second.id, false],
			]),
		);
		expect(list).toHaveLength(2);
		const unavailable = list.find((a) => a.id === second.id);
		const ref = { actionId: second.id, actionName: 'Other', version: 1 };
		expect(unavailable?.versions[0].pinValues).toEqual(parentPinValues('operation', ref));
	});

	it('does not list a parent action in the response for custom nodes', async () => {
		const { actionId } = await createNodeWithAction();
		const parentAction = await addParent();

		const nodes = await service.list(owner);
		const parentActions = await service.listParentActions(owner);

		expect(nodes).toHaveLength(1);
		expect(nodes[0].actions.map((a) => a.id)).toEqual([actionId]);
		expect(parentActions.map((a) => a.id)).toEqual([parentAction.id]);
	});

	it('lists the eligible parents', () => {
		expect(service.listParents(member)).toEqual([
			{ nodeType: RESOURCE_PARENT, shape: 'resource' },
			{ nodeType: OPERATION_PARENT, shape: 'operation' },
		]);
	});

	it('refreshes the registry one time for each write', async () => {
		const action = await service.addParentAction(owner, {
			parentNodeType: RESOURCE_PARENT,
			draft: parentInvoice(),
		});
		expect(registry.refresh).toHaveBeenCalledTimes(1);

		await service.saveAction(owner, action.id, { draft: withQueryInput(parentInvoice(), 'a') });
		expect(registry.refresh).toHaveBeenCalledTimes(2);

		await service.deleteAction(owner, action.id);
		expect(registry.refresh).toHaveBeenCalledTimes(3);
	});

	it('needs the scope customNode:create to create and customNode:list to list', async () => {
		await expect(
			service.addParentAction(member, { parentNodeType: RESOURCE_PARENT, draft: parentInvoice() }),
		).rejects.toBeInstanceOf(ForbiddenError);
		const noScopes = { ...member, role: { ...member.role, scopes: [] } } as unknown as User;
		await expect(service.listParentActions(noScopes)).rejects.toBeInstanceOf(ForbiddenError);
		expect(() => service.listParents(noScopes)).toThrow(ForbiddenError);
		await expect(service.listParentActions(member)).resolves.toEqual([]);
		expect(await countRows()).toMatchObject({ actions: 0 });
	});
});
