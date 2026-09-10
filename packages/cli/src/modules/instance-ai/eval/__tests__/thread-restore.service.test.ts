import { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type {
	CredentialsEntity,
	CredentialsRepository,
	Project,
	SharedWorkflowRepository,
	User,
	WorkflowEntity,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { PolicyCleared, PolicyViolation } from '@n8n/decorators';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AgentsService } from '@/modules/agents/agents.service';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { EvalThreadRestoreService } from '../thread-restore.service';

function makeNode(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'node-1',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.2,
		position: [100, 200],
		parameters: { channel: '#cosmic-otter-alerts' },
		...overrides,
	};
}

describe('EvalThreadRestoreService', () => {
	const workflowRepo = mock<WorkflowRepository>();
	const sharedWorkflowRepo = mock<SharedWorkflowRepository>();
	const credentialsRepo = mock<CredentialsRepository>();
	const workflowPublishedVersionRepo = mock<WorkflowPublishedVersionRepository>();
	const dataTableService = mock<DataTableService>();
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const workflowService = mock<WorkflowService>();
	const service = new EvalThreadRestoreService(
		workflowRepo,
		sharedWorkflowRepo,
		credentialsRepo,
		workflowPublishedVersionRepo,
		dataTableService,
		policyEnforcementService,
		workflowHistoryService,
		workflowService,
	);
	const transactionManager = mock<EntityManager>();
	const cleared = mock<PolicyCleared<'workflowSave'>>();

	beforeEach(() => {
		vi.clearAllMocks();
		workflowRepo.create.mockImplementation((entity) => entity as never);
		workflowRepo.runInTransaction.mockImplementation(
			async (ctx, fn) => await fn(transactionManager, ctx),
		);
		workflowRepo.findByIds.mockResolvedValue([]);
		credentialsRepo.findByNameAndTypeInProject.mockResolvedValue([]);
		policyEnforcementService.enforceWorkflowSave.mockResolvedValue(cleared);
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue(undefined);
	});

	it('recreates the workflow pinned to its seeded id and grants project ownership', async () => {
		await service.restoreWorkflows(
			[{ id: 'wf-original', name: 'Daily digest', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.createContent).toHaveBeenCalledTimes(1);
		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved).toMatchObject({
			id: 'wf-original',
			name: 'Daily digest',
			active: false,
		});
		expect(saved.versionId).toEqual(expect.any(String));
		expect(sharedWorkflowRepo.makeOwner).toHaveBeenCalledWith(
			['wf-original'],
			'project-1',
			transactionManager,
		);
	});

	it('checks the seed content against the thread project and threads the clearance into the sealed write', async () => {
		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'Daily digest', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		const saved = workflowRepo.create.mock.calls[0][0];
		expect(policyEnforcementService.enforceWorkflowSave).toHaveBeenCalledExactlyOnceWith({
			workflow: { id: null, name: 'Daily digest', nodes: saved.nodes },
			storedWorkflow: null,
			projectId: 'project-1',
		});
		expect(workflowRepo.runInTransaction).toHaveBeenCalledExactlyOnceWith(
			{ policyCleared: cleared },
			expect.any(Function),
		);
		expect(workflowRepo.createContent).toHaveBeenCalledExactlyOnceWith(
			saved,
			expect.objectContaining({ policyCleared: cleared }),
		);
		expect(workflowRepo.save).not.toHaveBeenCalled();
	});

	it('strips a node credential the project does not hold, so a seed cannot bypass the credential pin', async () => {
		const node = makeNode({
			credentials: { slackApi: { id: 'cred-from-source-instance', name: 'Slack' } },
		});

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
		);

		expect(credentialsRepo.findByNameAndTypeInProject).toHaveBeenCalledExactlyOnceWith(
			'Slack',
			'slackApi',
			'project-1',
		);
		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved.nodes).toHaveLength(1);
		expect(saved.nodes?.[0]).not.toHaveProperty('credentials');
		expect(saved.nodes?.[0]).toMatchObject({ name: 'Slack', parameters: expect.any(Object) });
	});

	it('points a node credential at the project credential of the same type and name', async () => {
		credentialsRepo.findByNameAndTypeInProject.mockImplementation(async (name, type) =>
			name === 'Slack' && type === 'slackApi'
				? [mock<CredentialsEntity>({ id: 'cred-here', name: 'Slack' })]
				: [],
		);
		const node = makeNode({
			credentials: {
				slackApi: { id: 'cred-from-source-instance', name: 'Slack' },
				openAiApi: { id: 'cred-from-source-instance-2', name: 'OpenAI' },
			},
		});

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
		);

		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved.nodes?.[0]?.credentials).toEqual({
			slackApi: { id: 'cred-here', name: 'Slack' },
		});
	});

	it('prefers the credential the thread is allowed to see when several share type and name', async () => {
		credentialsRepo.findByNameAndTypeInProject.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'cred-other-thread', name: 'Slack' }),
			mock<CredentialsEntity>({ id: 'cred-this-thread', name: 'Slack' }),
		]);
		const node = makeNode({ credentials: { slackApi: { id: '', name: 'Slack' } } });

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
			new Map(),
			new Set(['cred-this-thread']),
		);

		const saved = workflowRepo.create.mock.calls[0][0];
		expect(saved.nodes?.[0]?.credentials).toEqual({
			slackApi: { id: 'cred-this-thread', name: 'Slack' },
		});
	});

	it('strips a node credential when several project credentials share its type and name, like the product resolver', async () => {
		credentialsRepo.findByNameAndTypeInProject.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'cred-a', name: 'Slack' }),
			mock<CredentialsEntity>({ id: 'cred-b', name: 'Slack' }),
		]);
		const node = makeNode({ credentials: { slackApi: { id: '', name: 'Slack' } } });

		await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.create.mock.calls[0][0].nodes?.[0]).not.toHaveProperty('credentials');
	});

	it('refuses a published seed whose node credential does not resolve, naming it', async () => {
		const node = makeNode({ credentials: { slackApi: { id: '', name: 'Slak' } } });

		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-live', name: 'wf', nodes: [node], connections: {}, published: true }],
				'project-1',
			),
		).rejects.toThrow(
			'Seed workflow wf-live is published, but its slackApi credential "Slak" matched 0 project credentials (need exactly 1)',
		);
		expect(workflowRepo.runInTransaction).not.toHaveBeenCalled();
	});

	it('refuses a published seed whose node credential matches several project credentials', async () => {
		credentialsRepo.findByNameAndTypeInProject.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'cred-a', name: 'Slack' }),
			mock<CredentialsEntity>({ id: 'cred-b', name: 'Slack' }),
		]);
		const node = makeNode({ credentials: { slackApi: { id: '', name: 'Slack' } } });

		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-live', name: 'wf', nodes: [node], connections: {}, published: true }],
				'project-1',
			),
		).rejects.toThrow(
			'Seed workflow wf-live is published, but its slackApi credential "Slack" matched 2 project credentials (need exactly 1)',
		);
		expect(workflowRepo.runInTransaction).not.toHaveBeenCalled();
	});

	it('refuses a published seed whose node credential reference has no name', async () => {
		// The seed schema lets any object through as a node; this reference lost its name.
		const node = makeNode({ credentials: { slackApi: { id: 'cred-1' } } as never });

		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-live', name: 'wf', nodes: [node], connections: {}, published: true }],
				'project-1',
			),
		).rejects.toThrow(
			'Seed workflow wf-live is published, but its slackApi credential reference has no name',
		);
		expect(credentialsRepo.findByNameAndTypeInProject).not.toHaveBeenCalled();
		expect(workflowRepo.runInTransaction).not.toHaveBeenCalled();
	});

	it('publishes only the seeds flagged published, as the requesting user, with their history row in place', async () => {
		const user = mock<User>();

		const published = await service.publishSeedWorkflows(
			[
				{ id: 'wf-live', name: 'Live', nodes: [], connections: {}, published: true },
				{ id: 'wf-draft', name: 'Draft', nodes: [], connections: {} },
			],
			user,
		);

		// The caller's rollback unpublishes these: a re-applied seed is not a created one.
		expect(published).toEqual(['wf-live']);
		expect(workflowHistoryService.snapshotCurrent).toHaveBeenCalledExactlyOnceWith('wf-live');
		expect(workflowService.activateWorkflow).toHaveBeenCalledExactlyOnceWith(user, 'wf-live');
		// The row first: activation looks the version up in the history.
		expect(workflowHistoryService.snapshotCurrent.mock.invocationCallOrder[0]).toBeLessThan(
			workflowService.activateWorkflow.mock.invocationCallOrder[0],
		);
	});

	it('unpublishes every seed it attempted when an activation fails, the failed one included', async () => {
		const user = mock<User>();
		workflowService.activateWorkflow
			.mockResolvedValueOnce(mock<WorkflowEntity>())
			.mockRejectedValueOnce(new Error('Workflow has no trigger'));

		await expect(
			service.publishSeedWorkflows(
				[
					{ id: 'wf-first', name: 'First', nodes: [], connections: {}, published: true },
					{ id: 'wf-second', name: 'Second', nodes: [], connections: {}, published: true },
				],
				user,
			),
		).rejects.toThrow('Workflow has no trigger');

		// The failed seed too: activation can throw after its triggers are registered.
		expect(workflowService.deactivateWorkflowAsSystem.mock.calls).toEqual([
			['wf-first'],
			['wf-second'],
		]);
	});

	it('keeps unpublishing the other seeds when one deactivation fails', async () => {
		workflowService.deactivateWorkflowAsSystem.mockRejectedValueOnce(new Error('already gone'));

		await service.unpublishWorkflows(['wf-first', 'wf-second']);

		expect(workflowService.deactivateWorkflowAsSystem.mock.calls).toEqual([
			['wf-first'],
			['wf-second'],
		]);
	});

	it('unpublishes a seed and waits for its publication teardown before the rollback deletes it', async () => {
		workflowPublishedVersionRepo.getPublishedVersionId
			.mockResolvedValueOnce('version-live')
			.mockResolvedValueOnce(null);

		await service.deleteWorkflows(['wf-live']);

		expect(workflowService.deactivateWorkflowAsSystem).toHaveBeenCalledExactlyOnceWith('wf-live');
		expect(workflowService.deactivateWorkflowAsSystem.mock.invocationCallOrder[0]).toBeLessThan(
			workflowPublishedVersionRepo.getPublishedVersionId.mock.invocationCallOrder[0],
		);
		expect(workflowPublishedVersionRepo.getPublishedVersionId).toHaveBeenCalledTimes(2);
		expect(workflowRepo.delete).toHaveBeenCalledExactlyOnceWith({ id: 'wf-live' });
	});

	it('still deletes the seed when the publication lookup fails', async () => {
		workflowPublishedVersionRepo.getPublishedVersionId.mockRejectedValueOnce(new Error('db down'));

		await service.deleteWorkflows(['wf-live']);

		expect(workflowRepo.delete).toHaveBeenCalledExactlyOnceWith({ id: 'wf-live' });
	});

	it('does not re-grant ownership when the workflow already exists in this project', async () => {
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue({ id: 'project-1' } as Project);
		const storedNodes = [makeNode({ id: 'old-node', name: 'Old' })];
		workflowRepo.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Old name', nodes: storedNodes },
		] as never);

		const created = await service.restoreWorkflows(
			[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
			'project-1',
		);

		expect(workflowRepo.findByIds).toHaveBeenCalledWith(['wf-1'], {
			fields: ['id', 'name', 'nodes'],
		});
		expect(policyEnforcementService.enforceWorkflowSave).toHaveBeenCalledExactlyOnceWith({
			workflow: { id: 'wf-1', name: 'wf', nodes: expect.any(Array) },
			storedWorkflow: { id: 'wf-1', name: 'Old name', nodes: storedNodes },
			projectId: 'project-1',
		});
		expect(workflowRepo.updateContent).toHaveBeenCalledExactlyOnceWith(
			'wf-1',
			expect.objectContaining({ name: 'wf', active: false, versionId: expect.any(String) }),
			expect.objectContaining({ policyCleared: cleared }),
		);
		expect(workflowRepo.createContent).not.toHaveBeenCalled();
		expect(sharedWorkflowRepo.makeOwner).not.toHaveBeenCalled();
		expect(created).toEqual([]); // not newly created
	});

	it('refuses to overwrite a workflow owned by another project', async () => {
		sharedWorkflowRepo.getWorkflowOwningProject.mockResolvedValue({
			id: 'other-project',
		} as Project);

		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
				'project-1',
			),
		).rejects.toThrow(BadRequestError);
		expect(policyEnforcementService.enforceWorkflowSave).not.toHaveBeenCalled();
		expect(workflowRepo.createContent).not.toHaveBeenCalled();
	});

	it('rejects a structurally invalid node without writing anything', async () => {
		await expect(
			service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [{ name: 'no type' }], connections: {} }],
				'project-1',
			),
		).rejects.toThrow(BadRequestError);
		expect(policyEnforcementService.enforceWorkflowSave).not.toHaveBeenCalled();
		expect(workflowRepo.createContent).not.toHaveBeenCalled();
	});

	describe('policy refusal', () => {
		const violation: PolicyViolation = {
			kind: 'test-denial',
			checkId: 'test-check',
			message: 'Denied by the test policy check',
			subject: 'n8n-nodes-base.slack',
			subjectType: 'nodeType',
		};

		it('fails the restore, names the refused seed and rolls back the workflows already created', async () => {
			policyEnforcementService.enforceWorkflowSave
				.mockResolvedValueOnce(cleared)
				.mockRejectedValueOnce(new PolicyViolationError([violation]));

			const restore = service.restoreWorkflows(
				[
					{ id: 'wf-ok', name: 'Allowed', nodes: [makeNode()], connections: {} },
					{ id: 'wf-blocked', name: 'Blocked', nodes: [makeNode()], connections: {} },
				],
				'project-1',
			);

			await expect(restore).rejects.toThrow(PolicyViolationError);
			await expect(restore).rejects.toThrow(
				'Seed workflow wf-blocked ("Blocked") was refused by policy: Denied by the test policy check',
			);
			await expect(restore).rejects.toMatchObject({
				httpStatusCode: 403,
				violations: [violation],
			});
			expect(workflowRepo.createContent).toHaveBeenCalledTimes(1);
			expect(workflowRepo.delete).toHaveBeenCalledExactlyOnceWith({ id: 'wf-ok' });
		});

		it('passes a check that breaks through unchanged', async () => {
			const failure = new Error('check crashed');
			policyEnforcementService.enforceWorkflowSave.mockRejectedValue(failure);

			await expect(
				service.restoreWorkflows(
					[{ id: 'wf-1', name: 'wf', nodes: [makeNode()], connections: {} }],
					'project-1',
				),
			).rejects.toBe(failure);
			expect(workflowRepo.createContent).not.toHaveBeenCalled();
		});
	});

	describe('data tables', () => {
		it('recreates each table (schema only) under a unique name and maps the id', async () => {
			dataTableService.createDataTable.mockResolvedValue(mock<DataTable>({ id: 'dt-new' }));

			const idMap = await service.restoreDataTables(
				[
					{
						id: 'dt-old-1234',
						name: 'Size Up Coffee FAQs',
						columns: [
							{ name: 'keywords', type: 'string' },
							{ name: 'is_active', type: 'boolean' },
						],
					},
				],
				'project-1',
			);

			expect(idMap.get('dt-old-1234')).toBe('dt-new');
			expect([...idMap.values()]).toEqual(['dt-new']);

			const [projectId, dto] = dataTableService.createDataTable.mock.calls[0];
			expect(projectId).toBe('project-1');
			// Original name is kept, with a unique suffix appended to dodge the
			// per-project unique-name constraint across parallel iterations.
			expect(dto.name).toMatch(/^Size Up Coffee FAQs \[seed [0-9a-f]{8}\]$/);
			expect(dto.columns).toEqual([
				{ name: 'keywords', type: 'string' },
				{ name: 'is_active', type: 'boolean' },
			]);
			// Rows are never seeded — the table is recreated empty to keep trace
			// PII out of the eval instance.
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('seeds declared rows into the recreated table (TRUST-311)', async () => {
			dataTableService.createDataTable.mockResolvedValue(mock<DataTable>({ id: 'dt-new' }));

			await service.restoreDataTables(
				[
					{
						id: 'job-applications-1234',
						name: 'Job Applications',
						columns: [{ name: 'id', type: 'string' }],
						rows: [{ id: 'row_001' }, { id: 'row_002' }],
					},
				],
				'project-1',
			);

			// The table is created schema-only, then its rows are inserted against
			// the freshly created id (not the seed id).
			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-new', 'project-1', [
				{ id: 'row_001' },
				{ id: 'row_002' },
			]);
		});

		it('rolls back the created table when row seeding fails', async () => {
			dataTableService.createDataTable.mockResolvedValue(mock<DataTable>({ id: 'dt-new' }));
			dataTableService.insertRows.mockRejectedValueOnce(new Error('row insert failed'));

			await expect(
				service.restoreDataTables(
					[
						{
							id: 'job-applications-1234',
							name: 'Job Applications',
							columns: [{ name: 'id', type: 'string' }],
							rows: [{ id: 'row_001' }],
						},
					],
					'project-1',
				),
			).rejects.toThrow('row insert failed');

			expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-new', 'project-1');
		});

		it('creates the table under its EXACT name when uniquifyNames is false (TRUST-311)', async () => {
			dataTableService.createDataTable.mockResolvedValue(mock<DataTable>({ id: 'dt-new' }));

			await service.restoreDataTables(
				[
					{
						id: 'job-applications-1234',
						name: 'Job Applications',
						columns: [{ name: 'application_id', type: 'string' }],
						rows: [{ application_id: 'row_001' }],
					},
				],
				'project-1',
				{ uniquifyNames: false },
			);

			const [, dto] = dataTableService.createDataTable.mock.calls[0];
			// No ` [seed <uuid>]` suffix — the built workflow references it by this name.
			expect(dto.name).toBe('Job Applications');
			expect(dataTableService.insertRows).toHaveBeenCalledWith('dt-new', 'project-1', [
				{ application_id: 'row_001' },
			]);
		});

		it('rejects a too-short table id without creating anything (unsafe to string-replace)', async () => {
			await expect(
				service.restoreDataTables(
					[{ id: 'short', name: 'T', columns: [{ name: 'a', type: 'string' }] }],
					'project-1',
				),
			).rejects.toThrow(BadRequestError);
			expect(dataTableService.createDataTable).not.toHaveBeenCalled();
		});

		it('rolls back already-created tables when a later table fails', async () => {
			dataTableService.createDataTable
				.mockResolvedValueOnce(mock<DataTable>({ id: 'dt-new-1' }))
				.mockRejectedValueOnce(new Error('name conflict'));

			await expect(
				service.restoreDataTables(
					[
						{ id: 'dt-old-1111', name: 'A', columns: [{ name: 'a', type: 'string' }] },
						{ id: 'dt-old-2222', name: 'B', columns: [{ name: 'b', type: 'string' }] },
					],
					'project-1',
				),
			).rejects.toThrow('name conflict');

			// The first table was created, so it must be deleted on rollback.
			expect(dataTableService.deleteDataTable).toHaveBeenCalledWith('dt-new-1', 'project-1');
		});

		it('rewrites seed data-table ids in workflow nodes to the recreated ids', async () => {
			const node = makeNode({
				type: 'n8n-nodes-base.dataTable',
				parameters: { dataTableId: { __rl: true, mode: 'id', value: 'dt-old' } },
			});

			await service.restoreWorkflows(
				[{ id: 'wf-1', name: 'wf', nodes: [node], connections: {} }],
				'project-1',
				new Map([['dt-old', 'dt-new']]),
			);

			const saved = workflowRepo.create.mock.calls[0][0];
			expect(saved.nodes?.[0]?.parameters).toEqual({
				dataTableId: { __rl: true, mode: 'id', value: 'dt-new' },
			});
		});
	});

	describe('restoreAgents', () => {
		const agentsService = mockInstance(AgentsService);
		const moduleRegistry = mockInstance(ModuleRegistry);

		const seedAgent = (over: { id?: string; name?: string } = {}) => ({
			id: over.id ?? 'agent-original',
			config: {
				name: over.name ?? 'Support Triage',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage inbound tickets.',
				skills: [{ type: 'skill' as const, id: 'skill_1' }],
			},
			skills: {
				skill_1: { name: 'Triage rules', description: 'How to sort', instructions: 'Sort them.' },
			},
		});

		beforeEach(() => {
			moduleRegistry.isActive.calledWith('agents').mockReturnValue(true);
		});

		it('creates the agent at its seeded id, carrying its config and skill bodies', async () => {
			const agent = seedAgent();

			const created = await service.restoreAgents([agent], 'project-1');

			expect(created).toEqual(['agent-original']);
			expect(agentsService.create).toHaveBeenCalledExactlyOnceWith('project-1', 'Support Triage', {
				id: 'agent-original',
				schema: agent.config,
				skills: agent.skills,
			});
		});

		it('rewrites data-table ids in an agent node tool to the recreated tables', async () => {
			// Same rewrite the workflow restore does: a seeded agent's node tool carries
			// table ids from the instance the seed was authored on, which address nothing
			// here. Missed, the restored agent reads an empty/absent table.
			const agent = seedAgent();
			const config = {
				...agent.config,
				tools: [
					{
						type: 'node' as const,
						name: 'read_leads',
						node: {
							nodeType: 'n8n-nodes-base.dataTable',
							nodeTypeVersion: 1,
							nodeParameters: { dataTableId: 'dt-authored-01' },
						},
					},
				],
			};

			await service.restoreAgents(
				[{ ...agent, config }],
				'project-1',
				new Map([['dt-authored-01', 'dt-new-99']]),
			);

			const [, , options] = agentsService.create.mock.calls[0];
			expect(JSON.stringify(options?.schema)).toContain('dt-new-99');
			expect(JSON.stringify(options?.schema)).not.toContain('dt-authored-01');
		});

		it('rewrites the longer id first when one table id prefixes another', async () => {
			// "dt1234567" inside "dt12345678": replacing the short one first would eat
			// the long one's prefix and leave it addressing a table that never existed.
			const agent = seedAgent();
			const config = {
				...agent.config,
				tools: [
					{
						type: 'node' as const,
						name: 'read_leads',
						node: {
							nodeType: 'n8n-nodes-base.dataTable',
							nodeTypeVersion: 1,
							nodeParameters: { a: 'dt1234567', b: 'dt12345678' },
						},
					},
				],
			};

			await service.restoreAgents(
				[{ ...agent, config }],
				'project-1',
				new Map([
					['dt1234567', 'SHORT-NEW'],
					['dt12345678', 'LONG-NEW'],
				]),
			);

			const [, , options] = agentsService.create.mock.calls[0];
			const serialized = JSON.stringify(options?.schema);
			expect(serialized).toContain('SHORT-NEW');
			expect(serialized).toContain('LONG-NEW');
			expect(serialized).not.toContain('SHORT-NEW8');
		});

		it('leaves the config untouched when the seed created no data tables', async () => {
			const agent = seedAgent();

			await service.restoreAgents([agent], 'project-1');

			const [, , options] = agentsService.create.mock.calls[0];
			expect(options?.schema).toEqual(agent.config);
		});

		it('blanks credential ids, which address the instance the seed came from', async () => {
			// The agent counterpart of stripping a seed workflow's node credentials.
			// Emptied rather than removed: `credential` is a required FIELD on a vector
			// store and its embedding, so deleting it would fail config validation.
			const agent = seedAgent();
			const config = {
				...agent.config,
				credential: 'cred-from-source-instance',
				vectorStores: [
					{
						provider: 'pinecone' as const,
						name: 'docs',
						credential: 'cred-pinecone',
						useWhen: 'searching docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'cred-openai' },
						indexName: 'docs',
					},
				],
				// A chat integration names its credential `credentialId`; emptying it is
				// the draft state the config schema already models.
				integrations: [{ type: 'slack' as const, credentialId: 'cred-slack' }],
			};

			await service.restoreAgents([{ ...agent, config }], 'project-1');

			const [, , options] = agentsService.create.mock.calls[0];
			expect(options?.schema).toMatchObject({
				credential: '',
				vectorStores: [{ credential: '', embedding: { credential: '' } }],
				integrations: [{ type: 'slack', credentialId: '' }],
			});
			// Everything else survives the blanking untouched.
			expect(options?.schema).toMatchObject({
				name: 'Support Triage',
				instructions: 'Triage inbound tickets.',
				vectorStores: [{ indexName: 'docs', name: 'docs' }],
			});
		});

		it('rolls back agents already created when a later one fails', async () => {
			// A partial restore would leak an agent into the shared eval project, and the
			// build fails anyway — the thread never gets the history that references it.
			agentsService.create
				.mockResolvedValueOnce(mock())
				.mockRejectedValueOnce(new Error('An agent with this id already exists'));

			await expect(
				service.restoreAgents(
					[seedAgent({ id: 'agent-1' }), seedAgent({ id: 'agent-2', name: 'Other' })],
					'project-1',
				),
			).rejects.toThrow('already exists');

			expect(agentsService.delete).toHaveBeenCalledExactlyOnceWith('agent-1', 'project-1');
		});

		it('fails loudly when the agents module is disabled, rather than seeding nothing', async () => {
			moduleRegistry.isActive.calledWith('agents').mockReturnValue(false);

			await expect(service.restoreAgents([seedAgent()], 'project-1')).rejects.toThrow(
				BadRequestError,
			);
			expect(agentsService.create).not.toHaveBeenCalled();
		});

		it('does not touch the agents module for a seed that declares no agents', async () => {
			moduleRegistry.isActive.calledWith('agents').mockReturnValue(false);

			await expect(service.restoreAgents([], 'project-1')).resolves.toEqual([]);
		});
	});
});
