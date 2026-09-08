import { WorkflowEntity, type User } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type {
	WorkflowCreateBatchContext,
	WorkflowCreationService,
} from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { PackageImportBindings } from '../../../n8n-packages.types';
import type { WorkflowImportMatchService } from '../workflow-import-match.service';
import type {
	WorkflowImportContext,
	WorkflowImportPlan,
	WorkflowPlanItem,
} from '../workflow-import.types';
import { WorkflowImporter } from '../workflow-importer';

const makeWorkflow = (id: string): WorkflowEntity =>
	Object.assign(new WorkflowEntity(), {
		id,
		name: id,
		nodes: [],
		connections: {},
		isArchived: false,
	});

const bindings: PackageImportBindings = {
	credentials: new Map(),
	workflows: new Map(),
};

const user = mock<User>({ id: 'user-1' });
const context = {
	user,
	projectId: 'project-1',
	folderId: 'fallback-folder',
	droppedTagIds: new Set<string>(),
} as WorkflowImportContext;

describe('WorkflowImporter.apply', () => {
	it('prepares one batch context and passes it only to created workflows', async () => {
		const prepareBatchContext = vi.fn<WorkflowCreationService['prepareBatchContext']>();
		const createWorkflow = vi.fn<WorkflowCreationService['createWorkflow']>();
		const updateWorkflow = vi.fn<WorkflowService['update']>();
		const workflowCreationService = mock<WorkflowCreationService>({
			prepareBatchContext,
			createWorkflow,
		});
		const workflowService = mock<WorkflowService>({ update: updateWorkflow });
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			workflowCreationService,
			workflowService,
			mock<WorkflowFinderService>(),
		);
		const batchContext = mock<WorkflowCreateBatchContext>();
		const createEntity = makeWorkflow('source-create');
		const updateEntity = makeWorkflow('source-update');
		const existingUpdate = makeWorkflow('existing-update');
		const existingSkip = makeWorkflow('existing-skip');
		const created = makeWorkflow('created');
		const updated = makeWorkflow('updated');
		const items = [
			{
				action: 'create',
				sourceWorkflowId: 'source-create',
				entity: createEntity,
				decidedId: 'created-id',
				parentFolderId: 'folder-1',
				sourcePublished: false,
			},
			{
				action: 'update',
				archiveTransition: null,
				sourceWorkflowId: 'source-update',
				entity: updateEntity,
				existing: existingUpdate,
				parentFolderId: null,
				sourcePublished: false,
			},
			{
				action: 'skip',
				sourceWorkflowId: 'source-skip',
				entity: makeWorkflow('source-skip'),
				existing: existingSkip,
				parentFolderId: null,
				sourcePublished: false,
			},
		] satisfies WorkflowPlanItem[];
		const plan: WorkflowImportPlan = {
			items,
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		prepareBatchContext.mockResolvedValue(batchContext);
		createWorkflow.mockResolvedValue(created);
		updateWorkflow.mockResolvedValue(updated);

		await importer.apply(context, plan, bindings);

		expect(prepareBatchContext).toHaveBeenCalledExactlyOnceWith(
			user,
			'project-1',
			['folder-1'],
			[createEntity],
			bindings.credentials,
		);
		expect(createWorkflow).toHaveBeenCalledWith(
			user,
			expect.any(WorkflowEntity),
			expect.objectContaining({ batchContext }),
		);
		expect(updateWorkflow).toHaveBeenCalledWith(
			user,
			expect.any(WorkflowEntity),
			'existing-update',
			{ publicApi: true, source: 'import', allowArchivedUpdate: false },
		);
	});

	it('does not prepare a batch context when no workflows are created', async () => {
		const prepareBatchContext = vi.fn<WorkflowCreationService['prepareBatchContext']>();
		const updateWorkflow = vi.fn<WorkflowService['update']>();
		const workflowCreationService = mock<WorkflowCreationService>({ prepareBatchContext });
		const workflowService = mock<WorkflowService>({ update: updateWorkflow });
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			workflowCreationService,
			workflowService,
			mock<WorkflowFinderService>(),
		);
		const existing = makeWorkflow('existing');
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'update',
					archiveTransition: null,
					sourceWorkflowId: 'source',
					entity: makeWorkflow('source'),
					existing,
					parentFolderId: null,
					sourcePublished: false,
				},
			] satisfies WorkflowPlanItem[],
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		updateWorkflow.mockResolvedValue(existing);

		await importer.apply(context, plan, bindings);

		expect(prepareBatchContext).not.toHaveBeenCalled();
	});

	it('applies credential bindings recursively to inline workflows', async () => {
		const prepareBatchContext = vi.fn<WorkflowCreationService['prepareBatchContext']>();
		const createWorkflow = vi.fn<WorkflowCreationService['createWorkflow']>();
		const workflowCreationService = mock<WorkflowCreationService>({
			prepareBatchContext,
			createWorkflow,
		});
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			workflowCreationService,
			mock<WorkflowService>(),
			mock<WorkflowFinderService>(),
		);
		const source = makeWorkflow('source');
		const deepestWorkflow = JSON.stringify({
			nodes: [
				{
					credentials: {
						httpHeaderAuth: { id: 'source-credential', name: 'Inline credential' },
					},
				},
			],
			connections: {},
		});
		source.nodes = [
			{
				id: 'outer',
				name: 'Outer',
				type: 'n8n-nodes-base.executeWorkflow',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					source: 'parameter',
					workflowJson: JSON.stringify({
						nodes: [
							{
								type: 'n8n-nodes-base.executeWorkflow',
								parameters: { source: 'parameter', workflowJson: deepestWorkflow },
							},
						],
						connections: {},
					}),
				},
			},
		];
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'create',
					sourceWorkflowId: 'source',
					entity: source,
					decidedId: 'created',
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		const batchContext = mock<WorkflowCreateBatchContext>();
		prepareBatchContext.mockResolvedValue(batchContext);
		createWorkflow.mockResolvedValue(makeWorkflow('created'));

		await importer.apply(context, plan, {
			credentials: new Map([['source-credential', 'target-credential']]),
			workflows: new Map(),
		});

		const persisted = createWorkflow.mock.calls[0][1];
		const outerWorkflow = jsonParse<{
			nodes: Array<{ parameters: { workflowJson: string } }>;
		}>(persisted.nodes[0].parameters.workflowJson as string);
		const innerWorkflow = jsonParse<{
			nodes: Array<{ credentials: { httpHeaderAuth: { id: string } } }>;
		}>(outerWorkflow.nodes[0].parameters.workflowJson);
		expect(innerWorkflow.nodes[0].credentials.httpHeaderAuth.id).toBe('target-credential');
	});

	it('updates content when the package and target workflows are archived', async () => {
		const update = vi.fn<WorkflowService['update']>();
		const archive = vi.fn<WorkflowService['archive']>();
		const unarchive = vi.fn<WorkflowService['unarchive']>();
		const workflowService = mock<WorkflowService>({ update, archive, unarchive });
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			mock<WorkflowCreationService>(),
			workflowService,
			mock<WorkflowFinderService>(),
		);
		const existing = Object.assign(makeWorkflow('existing'), { isArchived: true });
		const entity = Object.assign(makeWorkflow('source'), { isArchived: true, name: 'New name' });
		const updated = Object.assign(makeWorkflow('existing'), {
			isArchived: true,
			name: 'New name',
		});
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'update',
					archiveTransition: null,
					sourceWorkflowId: 'source',
					entity,
					existing,
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		update.mockResolvedValue(updated);

		const result = await importer.apply(context, plan, bindings);

		expect(update).toHaveBeenCalledWith(user, expect.any(WorkflowEntity), 'existing', {
			publicApi: true,
			source: 'import',
			allowArchivedUpdate: true,
		});
		expect(archive).not.toHaveBeenCalled();
		expect(unarchive).not.toHaveBeenCalled();
		expect(result.outcomes[0]?.workflow).toBe(updated);
	});

	it('archives only after the content update succeeds', async () => {
		const update = vi.fn<WorkflowService['update']>();
		const archive = vi.fn<WorkflowService['archive']>();
		const workflowService = mock<WorkflowService>({ update, archive });
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			mock<WorkflowCreationService>(),
			workflowService,
			mock<WorkflowFinderService>(),
		);
		const existing = Object.assign(makeWorkflow('existing'), { isArchived: false });
		const archived = Object.assign(makeWorkflow('existing'), { isArchived: true });
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'update',
					archiveTransition: 'archive',
					sourceWorkflowId: 'source',
					entity: Object.assign(makeWorkflow('source'), { isArchived: true }),
					existing,
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		update.mockResolvedValue(existing);
		archive.mockResolvedValue(archived);

		const result = await importer.apply(context, plan, bindings);

		expect(update.mock.invocationCallOrder[0]).toBeLessThan(archive.mock.invocationCallOrder[0]);
		expect(result.outcomes[0]?.workflow).toBe(archived);
	});

	it('does not unarchive when the content update fails', async () => {
		const update = vi.fn<WorkflowService['update']>();
		const unarchive = vi.fn<WorkflowService['unarchive']>();
		const workflowService = mock<WorkflowService>({ update, unarchive });
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>(),
			mock<WorkflowCreationService>(),
			workflowService,
			mock<WorkflowFinderService>(),
		);
		const existing = Object.assign(makeWorkflow('existing'), { isArchived: true });
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'update',
					archiveTransition: 'unarchive',
					sourceWorkflowId: 'source',
					entity: Object.assign(makeWorkflow('source'), { isArchived: false }),
					existing,
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			conflicts: [],
			lineageConflicts: [],
			idConflicts: [],
			folderConflicts: [],
			archiveForbidden: [],
		};
		update.mockRejectedValue(new Error('Update failed'));

		await expect(importer.apply(context, plan, bindings)).rejects.toThrow('Update failed');
		expect(unarchive).not.toHaveBeenCalled();
	});
});

describe('WorkflowImporter.plan', () => {
	it('plans a content update when both workflows are archived', async () => {
		const matchService = mock<WorkflowImportMatchService>();
		const finder = mock<WorkflowFinderService>();
		const importer = new WorkflowImporter(
			matchService,
			mock<WorkflowCreationService>(),
			mock<WorkflowService>(),
			finder,
		);
		const existing = Object.assign(makeWorkflow('existing'), { isArchived: true });
		const entity = Object.assign(makeWorkflow('source'), { isArchived: true });
		matchService.findBySourceWorkflowIds.mockResolvedValue({
			matches: new Map([['source', existing]]),
			lineageConflicts: [],
		});
		matchService.findOwningProjectsByWorkflowId.mockResolvedValue(new Map());

		const plan = await importer.plan(
			context,
			[
				{
					sourceWorkflowId: 'source',
					entity,
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			{
				workflowConflictPolicy: 'new-version',
				workflowIdPolicy: 'source',
				workflowPublishingPolicy: 'preserve-published-state',
				missingNodeTypeMode: 'fail',
			},
		);

		expect(plan.items[0]).toMatchObject({ action: 'update', archiveTransition: null });
		expect(finder.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
	});

	it('reports an archive transition when the user cannot delete the workflow', async () => {
		const matchService = mock<WorkflowImportMatchService>();
		const finder = mock<WorkflowFinderService>();
		const importer = new WorkflowImporter(
			matchService,
			mock<WorkflowCreationService>(),
			mock<WorkflowService>(),
			finder,
		);
		const existing = Object.assign(makeWorkflow('existing'), { isArchived: false });
		const entity = Object.assign(makeWorkflow('source'), { isArchived: true });
		matchService.findBySourceWorkflowIds.mockResolvedValue({
			matches: new Map([['source', existing]]),
			lineageConflicts: [],
		});
		matchService.findOwningProjectsByWorkflowId.mockResolvedValue(new Map());
		finder.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());

		const plan = await importer.plan(
			context,
			[
				{
					sourceWorkflowId: 'source',
					entity,
					parentFolderId: null,
					sourcePublished: false,
				},
			],
			{
				workflowConflictPolicy: 'new-version',
				workflowIdPolicy: 'source',
				workflowPublishingPolicy: 'preserve-published-state',
				missingNodeTypeMode: 'fail',
			},
		);

		expect(plan.archiveForbidden).toEqual([
			{
				sourceWorkflowId: 'source',
				existingWorkflowId: 'existing',
				name: 'existing',
				projectId: 'project-1',
				transition: 'archive',
			},
		]);
	});
});
