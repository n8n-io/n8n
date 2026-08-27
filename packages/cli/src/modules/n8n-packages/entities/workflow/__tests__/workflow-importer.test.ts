import { WorkflowEntity, type User } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type {
	WorkflowCreateBatchContext,
	WorkflowCreationService,
} from '@/workflows/workflow-creation.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { ImportWorkflowProperties, PackageImportBindings } from '../../../n8n-packages.types';
import type { WorkflowImportMatchService } from '../workflow-import-match.service';
import type {
	PreparedWorkflow,
	WorkflowImportContext,
	WorkflowImportPlan,
	WorkflowPlanItem,
} from '../workflow-import.types';
import { WorkflowImporter } from '../workflow-importer';

const makeWorkflow = (id: string): WorkflowEntity =>
	Object.assign(new WorkflowEntity(), { id, name: id, nodes: [], connections: {} });

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

describe('WorkflowImporter.plan', () => {
	it('transfers ownership of prepared workflow entities to the plan', async () => {
		const findBySourceWorkflowIds = vi
			.fn<WorkflowImportMatchService['findBySourceWorkflowIds']>()
			.mockResolvedValue(new Map());
		const findOwningProjectsByWorkflowId = vi
			.fn<WorkflowImportMatchService['findOwningProjectsByWorkflowId']>()
			.mockResolvedValue(new Map());
		const importer = new WorkflowImporter(
			mock<WorkflowImportMatchService>({
				findBySourceWorkflowIds,
				findOwningProjectsByWorkflowId,
			}),
			mock<WorkflowCreationService>(),
			mock<WorkflowService>(),
		);
		const entity = makeWorkflow('source');
		const prepared: PreparedWorkflow[] = [
			{
				entity,
				sourceWorkflowId: 'source',
				parentFolderId: null,
				sourcePublished: false,
			},
		];
		const options = {
			workflowConflictPolicy: 'new-version',
			workflowPublishingPolicy: 'preserve-published-state',
			workflowIdPolicy: 'new',
			missingNodeTypeMode: 'fail',
		} satisfies ImportWorkflowProperties;

		const plan = await importer.plan(context, prepared, options);

		expect(prepared).toEqual([]);
		expect(plan.items[0].entity).toBe(entity);
	});
});

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
			idConflicts: [],
			folderConflicts: [],
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
			{ publicApi: true, source: 'import' },
		);
		expect(items[0].entity).toBe(created);
		expect(items[1].entity).toBe(updated);
		expect(items[1].existing?.nodes).toBe(updated.nodes);
		expect(items[1].existing?.parentFolder).toBe(existingUpdate.parentFolder);
		expect(items[2].entity).toBe(existingSkip);
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
		);
		const existing = makeWorkflow('existing');
		const plan: WorkflowImportPlan = {
			items: [
				{
					action: 'update',
					sourceWorkflowId: 'source',
					entity: makeWorkflow('source'),
					existing,
					parentFolderId: null,
					sourcePublished: false,
				},
			] satisfies WorkflowPlanItem[],
			conflicts: [],
			idConflicts: [],
			folderConflicts: [],
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
			idConflicts: [],
			folderConflicts: [],
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
});
