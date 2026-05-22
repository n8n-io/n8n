import type { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { SchemaMapBuilder } from '../schema-map.builder';

import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

const makeUser = (overrides: Partial<User> = {}): User =>
	({
		id: 'user-1',
		...overrides,
	}) as unknown as User;

const makeConfig = (
	dialect: 'postgresdb' | 'sqlite' = 'postgresdb',
	tablePrefix = '',
): GlobalConfig => ({ database: { type: dialect, tablePrefix } }) as unknown as GlobalConfig;

const makeWorkflow = (
	id: string,
	name: string,
	nodes: Array<{ id: string; name: string }> = [],
): WorkflowEntity => ({ id, name, nodes }) as unknown as WorkflowEntity;

describe('SchemaMapBuilder', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowSharingService = mock<WorkflowSharingService>();
	let globalConfig: GlobalConfig;
	let builder: SchemaMapBuilder;
	const user = makeUser();

	beforeEach(() => {
		jest.clearAllMocks();
		globalConfig = makeConfig('postgresdb');
		builder = new SchemaMapBuilder(workflowRepository, workflowSharingService, globalConfig);
	});

	// ---------------------------------------------------------------- Group 1
	describe('empty referenced names', () => {
		it('still fetches accessible workflow ids', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			const map = await builder.forUser(user, []);
			expect(map.accessibleWorkflowIds).toEqual(['wf-1']);
			expect(map.hasReadAccess('wf-1')).toBe(true);
		});

		it('skips the workflows lookup', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			await builder.forUser(user, []);
			expect(workflowRepository.find).not.toHaveBeenCalled();
		});

		it('resolveWorkflowId returns null for any name', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			const map = await builder.forUser(user, []);
			expect(map.resolveWorkflowId('anything')).toBeNull();
		});
	});

	// ---------------------------------------------------------------- Group 2
	describe('user has no accessible workflows', () => {
		beforeEach(() => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
		});

		it('returns empty resolution', async () => {
			const map = await builder.forUser(user, ['anything']);
			expect(map.resolveWorkflowId('anything')).toBeNull();
			expect(map.accessibleWorkflowIds).toEqual([]);
		});

		it('skips the workflows lookup', async () => {
			await builder.forUser(user, ['anything']);
			expect(workflowRepository.find).not.toHaveBeenCalled();
		});
	});

	// ---------------------------------------------------------------- Group 3
	describe('resolves accessible workflow names', () => {
		beforeEach(() => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
			workflowRepository.find.mockResolvedValue([
				makeWorkflow('wf-1', 'crm-sync'),
				makeWorkflow('wf-2', 'billing'),
			]);
		});

		it('maps names to ids', async () => {
			const map = await builder.forUser(user, ['crm-sync', 'billing']);
			expect(map.resolveWorkflowId('crm-sync')).toBe('wf-1');
			expect(map.resolveWorkflowId('billing')).toBe('wf-2');
		});
	});

	// ---------------------------------------------------------------- Group 4
	describe('does not leak inaccessible workflows', () => {
		it('returns null for workflows whose ids are not in the accessible set', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'public')]);

			const map = await builder.forUser(user, ['public', 'secret']);
			expect(map.resolveWorkflowId('public')).toBe('wf-1');
			expect(map.resolveWorkflowId('secret')).toBeNull();
		});
	});

	// ---------------------------------------------------------------- Group 5
	describe('missing names', () => {
		it('returns null when a name does not match any workflow', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync')]);

			const map = await builder.forUser(user, ['crm-sync', 'nonexistent']);
			expect(map.resolveWorkflowId('nonexistent')).toBeNull();
		});
	});

	// ---------------------------------------------------------------- Group 6
	describe('hasReadAccess', () => {
		beforeEach(() => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync')]);
		});

		it('returns true for ids in the accessible set', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.hasReadAccess('wf-1')).toBe(true);
			expect(map.hasReadAccess('wf-2')).toBe(true);
		});

		it('returns false for ids outside the accessible set', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.hasReadAccess('wf-99')).toBe(false);
		});
	});

	// ---------------------------------------------------------------- Group 7
	describe('dialect and tablePrefix', () => {
		it('passes postgresdb dialect through', async () => {
			globalConfig = makeConfig('postgresdb');
			builder = new SchemaMapBuilder(workflowRepository, workflowSharingService, globalConfig);
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			const map = await builder.forUser(user, []);
			expect(map.dialect).toBe('postgresdb');
		});

		it('passes sqlite dialect through', async () => {
			globalConfig = makeConfig('sqlite');
			builder = new SchemaMapBuilder(workflowRepository, workflowSharingService, globalConfig);
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			const map = await builder.forUser(user, []);
			expect(map.dialect).toBe('sqlite');
		});

		it('passes tablePrefix through', async () => {
			globalConfig = makeConfig('postgresdb', 'n8n_');
			builder = new SchemaMapBuilder(workflowRepository, workflowSharingService, globalConfig);
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			const map = await builder.forUser(user, []);
			expect(map.tablePrefix).toBe('n8n_');
		});
	});

	// ---------------------------------------------------------------- Group 8
	describe('scope used', () => {
		it('calls getSharedWorkflowIds with the workflow:read scope', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
			await builder.forUser(user, ['anything']);
			expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
				scopes: ['workflow:read'],
			});
			expect(workflowSharingService.getSharedWorkflowIds).toHaveBeenCalledTimes(1);
		});
	});

	// ---------------------------------------------------------------- Group 9
	describe('workflow lookup query', () => {
		it('uses one WHERE branch when no input matches an accessible id', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([]);
			await builder.forUser(user, ['crm-sync']);

			const args = workflowRepository.find.mock.calls[0][0]!;
			expect(Array.isArray(args.where)).toBe(true);
			expect(args.where).toHaveLength(1);
		});

		it('adds a second WHERE branch when any input matches an accessible id', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([]);
			await builder.forUser(user, ['crm-sync', 'wf-1']);

			const args = workflowRepository.find.mock.calls[0][0]!;
			expect(Array.isArray(args.where)).toBe(true);
			expect(args.where).toHaveLength(2);
		});

		it("includes 'nodes' in the select so node ids/names can be resolved", async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([]);
			await builder.forUser(user, ['crm-sync']);

			const args = workflowRepository.find.mock.calls[0][0]!;
			expect(args.select).toEqual(expect.arrayContaining(['id', 'name', 'nodes']));
		});
	});

	// ---------------------------------------------------------------- Group 10
	describe('workflow lookup by id', () => {
		it('resolves a workflow when the input matches its accessible id', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync')]);

			const map = await builder.forUser(user, ['wf-1']);
			expect(map.resolveWorkflowId('wf-1')).toBe('wf-1');
		});

		it('does not resolve ids outside the accessible set', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync')]);

			const map = await builder.forUser(user, ['wf-1']);
			expect(map.resolveWorkflowId('wf-99')).toBeNull();
		});

		it('still resolves a workflow by name when the id is also queryable', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync')]);

			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.resolveWorkflowId('crm-sync')).toBe('wf-1');
		});
	});

	// ---------------------------------------------------------------- Group 11
	describe('resolveNodeName', () => {
		const nodes = [
			{ id: 'node-uuid-1', name: 'Get users' },
			{ id: 'node-uuid-2', name: 'Send email' },
		];

		beforeEach(() => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
			workflowRepository.find.mockResolvedValue([makeWorkflow('wf-1', 'crm-sync', nodes)]);
		});

		it('resolves a node by name (identity)', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.resolveNodeName('wf-1', 'Get users')).toBe('Get users');
		});

		it('resolves a node by id to its canonical name', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.resolveNodeName('wf-1', 'node-uuid-1')).toBe('Get users');
			expect(map.resolveNodeName('wf-1', 'node-uuid-2')).toBe('Send email');
		});

		it('returns null for unknown node inputs', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.resolveNodeName('wf-1', 'bogus')).toBeNull();
		});

		it('returns null for unknown workflow ids', async () => {
			const map = await builder.forUser(user, ['crm-sync']);
			expect(map.resolveNodeName('wf-99', 'Get users')).toBeNull();
		});

		it('isolates node resolution per workflow', async () => {
			workflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1', 'wf-2']);
			workflowRepository.find.mockResolvedValue([
				makeWorkflow('wf-1', 'crm-sync', [{ id: 'a', name: 'NodeA' }]),
				makeWorkflow('wf-2', 'billing', [{ id: 'b', name: 'NodeB' }]),
			]);
			const map = await builder.forUser(user, ['crm-sync', 'billing']);
			expect(map.resolveNodeName('wf-1', 'NodeA')).toBe('NodeA');
			expect(map.resolveNodeName('wf-1', 'NodeB')).toBeNull();
			expect(map.resolveNodeName('wf-1', 'b')).toBeNull();
			expect(map.resolveNodeName('wf-2', 'NodeB')).toBe('NodeB');
			expect(map.resolveNodeName('wf-2', 'a')).toBeNull();
		});
	});
});
