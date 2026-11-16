import type { LicenseState } from '@n8n/backend-common';
import type {
	CredentialsRepository,
	SharedWorkflowRepository,
	User,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { BadRequestError, UserError } from '@n8n/errors';
import type { DataTableService } from '@n8n/backend-module-data-table';
import { seedAgentBuilderTargetMetadata } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { FolderService } from '@/services/folder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { EvalThreadRestoreService, type SeedArtifactsRequest } from '../thread-restore.service';

vi.mock('@n8n/instance-ai', () => ({
	seedAgentBuilderTargetMetadata: vi.fn((targets: unknown) => ({ boundTargets: targets })),
}));

const PROJECT_ID = 'project-1';

describe('EvalThreadRestoreService.restoreSeedArtifacts', () => {
	const user = mock<User>({ id: 'user-1' });
	const service = new EvalThreadRestoreService(
		mock<WorkflowRepository>(),
		mock<SharedWorkflowRepository>(),
		mock<CredentialsRepository>(),
		mock<WorkflowPublishedVersionRepository>(),
		mock<DataTableService>(),
		mock<PolicyEnforcementService>(),
		mock<WorkflowHistoryService>(),
		mock<WorkflowService>(),
		mock<FolderService>(),
		mock<LicenseState>(),
	);

	const folder = { id: 'seedFolder01', name: 'Ops' };
	const dataTable = { id: 'dt-seed-1234', name: 'FAQs', columns: [] };
	const workflow = {
		id: 'wf-1',
		name: 'Seeded',
		nodes: [],
		connections: {},
		parentFolderId: 'seedFolder01',
		published: true,
	};
	const agent = {
		id: 'agent-1',
		config: { name: 'Support Triage', model: 'anthropic/claude-sonnet-4-5', instructions: 'x' },
	};
	const messages = [{ id: 'm1', role: 'user' }];
	const seed = {
		messages,
		folders: [folder],
		dataTables: [dataTable],
		workflows: [workflow],
		agents: [agent],
	} as SeedArtifactsRequest;

	const folderIdMap = new Map([['seedFolder01', 'folder-new']]);
	const dataTableIdMap = new Map([['dt-seed-1234', 'dt-new']]);

	// Recreated per test: the shared config restores spies after each one.
	const spySteps = () => ({
		restoreFolders: vi.spyOn(service, 'restoreFolders').mockResolvedValue(folderIdMap),
		restoreDataTables: vi.spyOn(service, 'restoreDataTables').mockResolvedValue(dataTableIdMap),
		restoreWorkflows: vi.spyOn(service, 'restoreWorkflows').mockResolvedValue(['wf-1']),
		publishSeedWorkflows: vi.spyOn(service, 'publishSeedWorkflows').mockResolvedValue(['wf-1']),
		restoreAgents: vi.spyOn(service, 'restoreAgents').mockResolvedValue(['agent-1']),
	});
	const spyUndo = () => ({
		deleteAgents: vi.spyOn(service, 'deleteAgents').mockResolvedValue(undefined),
		unpublishWorkflows: vi.spyOn(service, 'unpublishWorkflows').mockResolvedValue(undefined),
		deleteWorkflows: vi.spyOn(service, 'deleteWorkflows').mockResolvedValue(undefined),
		deleteDataTables: vi.spyOn(service, 'deleteDataTables').mockResolvedValue(undefined),
		deleteFolders: vi.spyOn(service, 'deleteFolders').mockResolvedValue(undefined),
	});
	let steps: ReturnType<typeof spySteps>;
	let undo: ReturnType<typeof spyUndo>;

	beforeEach(() => {
		steps = spySteps();
		undo = spyUndo();
	});

	const expectNothingCreated = () => {
		for (const fn of Object.values(steps)) expect(fn).not.toHaveBeenCalled();
	};

	const expectNothingUndone = () => {
		for (const fn of Object.values(undo)) expect(fn).not.toHaveBeenCalled();
	};

	it('restores in dependency order, returns the created ids and the binding', async () => {
		const allowed = new Set(['cred-1']);

		const result = await service.restoreSeedArtifacts(seed, PROJECT_ID, user, allowed);

		const order = Object.values(steps).map((fn) => fn.mock.invocationCallOrder[0]);
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(steps.restoreDataTables).toHaveBeenCalledWith([dataTable], PROJECT_ID, {
			uniquifyNames: true,
		});
		expect(steps.restoreWorkflows).toHaveBeenCalledWith(
			[workflow],
			PROJECT_ID,
			user,
			dataTableIdMap,
			allowed,
			folderIdMap,
		);
		expect(steps.restoreAgents).toHaveBeenCalledWith(
			[agent],
			PROJECT_ID,
			user,
			dataTableIdMap,
			allowed,
		);
		expect(seedAgentBuilderTargetMetadata).toHaveBeenCalledWith(
			[
				{
					agentId: 'agent-1',
					projectId: PROJECT_ID,
					name: 'Support Triage',
					ref: 'Support Triage',
				},
			],
			messages,
		);
		expect(result).toMatchObject({
			folderIds: ['folder-new'],
			dataTableIds: ['dt-new'],
			workflowIds: ['wf-1'],
			createdWorkflowIds: ['wf-1'],
			publishedWorkflowIds: ['wf-1'],
			agentIds: ['agent-1'],
			agentBuilderBinding: { boundTargets: expect.any(Array) },
		});
		expectNothingUndone();
	});

	it('returns no binding when no agents were created', async () => {
		steps.restoreAgents.mockResolvedValue([]);

		const result = await service.restoreSeedArtifacts({ ...seed, agents: [] }, PROJECT_ID, user);

		expect(result.agentBuilderBinding).toBeUndefined();
		expect(seedAgentBuilderTargetMetadata).not.toHaveBeenCalled();
	});

	it('rollback undoes everything it created, folders last', async () => {
		const result = await service.restoreSeedArtifacts(seed, PROJECT_ID, user);

		await result.rollback();

		expect(undo.deleteAgents).toHaveBeenCalledWith(['agent-1'], PROJECT_ID, user);
		expect(undo.unpublishWorkflows).toHaveBeenCalledWith(['wf-1']);
		expect(undo.deleteWorkflows).toHaveBeenCalledWith(['wf-1']);
		expect(undo.deleteDataTables).toHaveBeenCalledWith(['dt-new'], PROJECT_ID);
		expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		const order = Object.values(undo).map((fn) => fn.mock.invocationCallOrder[0]);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	describe('validation', () => {
		it('refuses an agent workflow tool that no seeded workflow backs, before creating anything', async () => {
			const unbacked = {
				...seed,
				agents: [
					{
						...agent,
						config: { ...agent.config, tools: [{ type: 'workflow', workflow: 'Missing' }] },
					},
				],
			} as SeedArtifactsRequest;

			await expect(service.restoreSeedArtifacts(unbacked, PROJECT_ID, user)).rejects.toThrow(
				BadRequestError,
			);

			expectNothingCreated();
			expectNothingUndone();
		});

		it('refuses a workflow placed in an undeclared folder, before creating anything', async () => {
			await expect(
				service.restoreSeedArtifacts({ ...seed, folders: [] }, PROJECT_ID, user),
			).rejects.toThrow(BadRequestError);

			expectNothingCreated();
			expectNothingUndone();
		});
	});

	describe('a failing step', () => {
		it('rolls back nothing when the folders fail, because they undo themselves', async () => {
			steps.restoreFolders.mockRejectedValueOnce(new Error('folders down'));

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				'folders down',
			);

			expect(steps.restoreDataTables).not.toHaveBeenCalled();
			expectNothingUndone();
		});

		it('rolls back the folders when the data tables fail', async () => {
			steps.restoreDataTables.mockRejectedValueOnce(new Error('tables down'));

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				'tables down',
			);

			expect(steps.restoreWorkflows).not.toHaveBeenCalled();
			expect(undo.deleteDataTables).toHaveBeenCalledWith([], PROJECT_ID);
			expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		});

		it('rolls back the data tables and folders when the workflows fail', async () => {
			steps.restoreWorkflows.mockRejectedValueOnce(new Error('workflows down'));

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				'workflows down',
			);

			expect(steps.publishSeedWorkflows).not.toHaveBeenCalled();
			expect(undo.deleteWorkflows).toHaveBeenCalledWith([]);
			expect(undo.deleteDataTables).toHaveBeenCalledWith(['dt-new'], PROJECT_ID);
			expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		});

		it('rolls back the created workflows when the publish fails', async () => {
			steps.publishSeedWorkflows.mockRejectedValueOnce(new Error('no trigger'));

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				'no trigger',
			);

			expect(steps.restoreAgents).not.toHaveBeenCalled();
			expect(undo.unpublishWorkflows).toHaveBeenCalledWith([]);
			expect(undo.deleteWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(undo.deleteDataTables).toHaveBeenCalledWith(['dt-new'], PROJECT_ID);
			expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		});

		it('unpublishes every published seed when the agents fail', async () => {
			// A re-applied seed: published, but not created by this restore.
			steps.restoreWorkflows.mockResolvedValueOnce([]);
			steps.restoreAgents.mockRejectedValueOnce(new Error('agents down'));

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				'agents down',
			);

			expect(undo.deleteAgents).toHaveBeenCalledWith([], PROJECT_ID, user);
			expect(undo.unpublishWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(undo.deleteWorkflows).toHaveBeenCalledWith([]);
			expect(undo.deleteDataTables).toHaveBeenCalledWith(['dt-new'], PROJECT_ID);
			expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		});

		it('rolls back everything, agents included, when the binding is refused', async () => {
			vi.mocked(seedAgentBuilderTargetMetadata).mockImplementationOnce(() => {
				throw new UserError('both address as "support-triage"');
			});

			await expect(service.restoreSeedArtifacts(seed, PROJECT_ID, user)).rejects.toThrow(
				/both address as/,
			);

			expect(undo.deleteAgents).toHaveBeenCalledWith(['agent-1'], PROJECT_ID, user);
			expect(undo.unpublishWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(undo.deleteWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(undo.deleteDataTables).toHaveBeenCalledWith(['dt-new'], PROJECT_ID);
			expect(undo.deleteFolders).toHaveBeenCalledWith([folder], folderIdMap, PROJECT_ID, user);
		});
	});
});
