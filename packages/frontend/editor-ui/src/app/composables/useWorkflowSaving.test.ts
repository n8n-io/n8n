import { useUIStore } from '@/app/stores/ui.store';
import { AutoSaveState, MODAL_CANCEL, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useWorkflowSaving } from './useWorkflowSaving';
import type { WorkflowState } from './useWorkflowState';
import router from '@/app/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

const modalConfirmSpy = vi.fn();

vi.mock('@/app/composables/useMessage', () => {
	return {
		useMessage: () => ({
			confirm: modalConfirmSpy,
		}),
	};
});

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({
		workflow: { update: true },
	}),
}));

const mockWorkflowState = {
	setWorkflowProperty: vi.fn(),
	setWorkflowName: vi.fn(),
	setActive: vi.fn(),
	setWorkflowId: vi.fn(),
	setWorkflowSettings: vi.fn(),
	setNodeValue: vi.fn(),
};

vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: () => mockWorkflowState,
}));

const getDuplicateTestWorkflow = (): WorkflowDataUpdate => ({
	name: 'Duplicate webhook test',
	active: false,
	nodes: [
		{
			parameters: {
				path: '5340ae49-2c96-4492-9073-7744d2e52b8a',
				options: {},
			},
			id: 'c1e1b6e7-df13-41b1-95f6-42903b85e438',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [680, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
		{
			parameters: {
				path: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
				options: {},
			},
			id: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
			name: 'Webhook 2',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [700, 40],
			webhookId: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
		},
		{
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: '/test',
				},
			},
			id: '979d8443-51b1-48e2-b239-acf399b66509',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [900, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
	],
	connections: {},
});

describe('useWorkflowSaving', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let backendConnectionStore: ReturnType<typeof useBackendConnectionStore>;

	afterEach(() => {
		vi.clearAllMocks();
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.setNodeTypes([
			mockNodeTypeDescription({
				name: CHAT_TRIGGER_NODE_TYPE,
				version: 1,
				group: ['trigger'],
			}),
		]);

		backendConnectionStore = useBackendConnectionStore();
		backendConnectionStore.setOnline(true);
	});

	describe('promptSaveUnsavedWorkflowChanges', () => {
		it('should prompt the user to save changes and proceed if confirmed', async () => {
			const workflow = createTestWorkflow({
				id: 'w0',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflow(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const next = vi.fn();
			const confirm = vi.fn().mockResolvedValue(true);
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			const npsSurveyStore = useNpsSurveyStore();
			vi.spyOn(npsSurveyStore, 'showNpsSurveyIfPossible').mockResolvedValue();

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CONFIRM);

			const mockWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const resolveSpy = vi.fn();
			const resolveMarker = Symbol();
			resolveSpy.mockReturnValue(resolveMarker);
			const mockRouter = {
				resolve: resolveSpy,
				currentRoute: { value: { params: { name: workflow.id }, query: { parentFolderId: '' } } },
			};

			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({
				router: mockRouter as never,
				workflowState: mockWorkflowState as WorkflowState,
			});

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(npsSurveyStore.showNpsSurveyIfPossible).toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(true);
			expect(cancel).not.toHaveBeenCalled();
		});

		it('should not proceed if the user cancels the confirmation modal', async () => {
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CANCEL);

			const workflowSaving = useWorkflowSaving({ router });
			const saveCurrentWorkflowSpy = vi.spyOn(workflowSaving, 'saveCurrentWorkflow');

			await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith();
		});

		it('should restore the route if the modal is closed and the workflow is not new', async () => {
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			const workflowStore = useWorkflowsStore();
			const workflowListStore = useWorkflowsListStore();
			const MOCK_ID = 'existing-workflow-id';
			const existingWorkflow = createTestWorkflow({ id: MOCK_ID });
			workflowStore.workflow.id = MOCK_ID;
			// Populate workflowsById to mark workflow as existing (not new)
			workflowListStore.workflowsById = { [MOCK_ID]: existingWorkflow };

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue('close');

			const workflowSaving = useWorkflowSaving({ router });
			const saveCurrentWorkflowSpy = vi.spyOn(workflowSaving, 'saveCurrentWorkflow');
			await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(true);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(
				router.resolve({
					name: VIEWS.WORKFLOW,
					params: { name: MOCK_ID },
				}),
			);
		});

		it('should close modal if workflow is not new', async () => {
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			const workflowStore = useWorkflowsStore();
			workflowStore.workflow.id = '';

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue('close');

			const workflowSaving = useWorkflowSaving({ router });
			const saveCurrentWorkflowSpy = vi.spyOn(workflowSaving, 'saveCurrentWorkflow');
			await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(true);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it('should proceed without prompting if there are no unsaved changes', async () => {
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateClean();

			const workflowSaving = useWorkflowSaving({ router });
			const saveCurrentWorkflowSpy = vi.spyOn(workflowSaving, 'saveCurrentWorkflow');
			await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).not.toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith();
		});

		it('should handle save failure and restore the route', async () => {
			const workflow = createTestWorkflow({
				id: 'w0',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const updateWorkflowSpy = vi.spyOn(workflowsStore, 'updateWorkflow');
			updateWorkflowSpy.mockImplementation(() => {
				throw new Error();
			});

			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.markStateDirty();

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CONFIRM);

			const resolveSpy = vi.fn();
			const resolveMarker = Symbol();
			resolveSpy.mockReturnValue(resolveMarker);
			const mockRouter = {
				resolve: resolveSpy,
				currentRoute: { value: { params: { name: workflow.id }, query: { parentFolderId: '' } } },
			};

			const workflowSaving = useWorkflowSaving({ router: mockRouter as never });
			await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(updateWorkflowSpy).toBeCalled();
			expect(uiStore.stateIsDirty).toEqual(true);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(resolveMarker);
		});
	});

	describe('saveAsNewWorkflow', () => {
		it('should respect `resetWebhookUrls: false` when duplicating workflows', async () => {
			const workflow = getDuplicateTestWorkflow();
			if (!workflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowSaving({ router });
			const webHookIdsPreSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = workflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: false,
				data: workflow,
			});

			const webHookIdsPostSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = workflow.nodes.map((node) => node.parameters.path);
			// Expect webhookIds and paths to be the same as in the original workflow
			expect(webHookIdsPreSave).toEqual(webHookIdsPostSave);
			expect(pathsPreSave).toEqual(pathsPostSave);
		});

		it('should respect `resetWebhookUrls: true` when duplicating workflows', async () => {
			const workflow = getDuplicateTestWorkflow();
			if (!workflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowSaving({ router });
			const webHookIdsPreSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = workflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: true,
				data: workflow,
			});

			const webHookIdsPostSave = workflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = workflow.nodes.map((node) => node.parameters.path);
			// Now, expect webhookIds and paths to be different
			expect(webHookIdsPreSave).not.toEqual(webHookIdsPostSave);
			expect(pathsPreSave).not.toEqual(pathsPostSave);
		});

		it('should preserve expression-based webhook paths when resetWebhookUrls is true', async () => {
			const workflow: WorkflowDataUpdate = {
				name: 'Expression webhook test',
				active: false,
				nodes: [
					{
						parameters: {
							path: '={{ $json.customPath }}',
							options: {},
						},
						id: 'node-with-expression',
						name: 'Webhook with expression',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [680, 20],
						webhookId: 'original-webhook-id-1',
					},
					{
						parameters: {
							path: 'static-path',
							options: {},
						},
						id: 'node-without-expression',
						name: 'Webhook with static path',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [700, 40],
						webhookId: 'original-webhook-id-2',
					},
				],
				connections: {},
			};

			const { saveAsNewWorkflow } = useWorkflowSaving({ router });
			const expressionPath = workflow.nodes![0].parameters.path;
			const staticPath = workflow.nodes![1].parameters.path;

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: true,
				data: workflow,
			});

			// Expression-based path should be preserved
			expect(workflow.nodes![0].parameters.path).toBe(expressionPath);
			// Static path should be replaced with new webhook ID
			expect(workflow.nodes![1].parameters.path).not.toBe(staticPath);
			expect(workflow.nodes![1].parameters.path).toBe(workflow.nodes![1].webhookId);
		});
	});

	describe('saveCurrentWorkflow', () => {
		it('should save the current workflow', async () => {
			const workflow = createTestWorkflow({
				id: 'w0',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w0' });
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w0',
				expect.objectContaining({ id: 'w0', active: true }),
				false,
			);
		});

		it('should not include active=false in the request if the workflow has no activatable trigger node', async () => {
			const workflow = createTestWorkflow({
				id: 'w1',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: true })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w1' });
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w1',
				expect.objectContaining({ id: 'w1' }),
				false,
			);
		});

		it('should send autosaved: true when autosaved parameter is true', async () => {
			const workflow = createTestWorkflow({
				id: 'w2',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { w2: workflow };
			workflowsStore.isWorkflowSaved = { w2: true };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w2' }, true, false, true);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w2',
				expect.objectContaining({ id: 'w2', active: true, autosaved: true }),
				false,
			);
		});

		it('should send autosaved: false when autosaved parameter is false', async () => {
			const workflow = createTestWorkflow({
				id: 'w3',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { w3: workflow };
			workflowsStore.isWorkflowSaved = { w3: true };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w3' }, true, false, false);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w3',
				expect.objectContaining({ id: 'w3', active: true, autosaved: false }),
				false,
			);
		});

		it('should include tags from store when saving workflow', async () => {
			const workflow = createTestWorkflow({
				id: 'w5',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
				tags: ['tag1', 'tag2'],
			});

			const workflowResponse = {
				...workflow,
				tags: [
					{ id: 'tag1', name: 'Tag 1' },
					{ id: 'tag2', name: 'Tag 2' },
				],
				checksum: 'test-checksum',
			};

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflowResponse);

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const mockWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: mockWorkflowState as WorkflowState,
			});

			await saveCurrentWorkflow({ id: 'w5' }, true, false, false);

			// Tags are now managed by workflowDocumentStore, not workflowState
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w5',
				expect.objectContaining({ tags: ['tag1', 'tag2'] }),
				false,
			);
		});
	});

	describe('autoSaveWorkflow', () => {
		it('should not schedule autosave if a save is already in progress', () => {
			const saveStore = useWorkflowSaveStore();

			// Simulate an ongoing save by setting pendingSave
			const mockPendingSave = new Promise<boolean>(() => {});
			saveStore.setPendingSave(mockPendingSave);

			const { autoSaveWorkflow } = useWorkflowSaving({ router });

			// Try to schedule autosave
			autoSaveWorkflow();

			// Should not have scheduled (state should still be Idle, not Scheduled)
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});

		it('should schedule autosave when state is Idle', () => {
			const saveStore = useWorkflowSaveStore();

			// Ensure state is Idle
			saveStore.reset();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);

			const { autoSaveWorkflow } = useWorkflowSaving({ router });

			// Schedule autosave
			autoSaveWorkflow();

			// State should be Scheduled
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);
		});

		it('should keep state dirty if changes were made during save', async () => {
			const workflow = createTestWorkflow({
				id: 'w-autosave',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const uiStore = useUIStore();
			const saveStore = useWorkflowSaveStore();

			uiStore.markStateDirty();
			const initialDirtyCount = uiStore.dirtyStateSetCount;

			const mockWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: mockWorkflowState as WorkflowState,
			});

			saveStore.setAutoSaveState(AutoSaveState.InProgress);

			const savePromise = saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			// Simulate user making changes during save
			uiStore.markStateDirty();

			await savePromise;

			// State should remain dirty because changes were made during save
			expect(uiStore.stateIsDirty).toBe(true);
			expect(uiStore.dirtyStateSetCount).toBeGreaterThan(initialDirtyCount);
		});

		it('should mark state clean after save if no changes were made during save', async () => {
			const workflow = createTestWorkflow({
				id: 'w-autosave-clean',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const uiStore = useUIStore();

			// Mark state as dirty
			uiStore.markStateDirty();

			const mockWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: mockWorkflowState as WorkflowState,
			});

			// Save without making any changes during save
			await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			// After save, state should be clean
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should skip autosave when another save is already in progress', async () => {
			const workflow = createTestWorkflow({
				id: 'w-concurrent',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const saveStore = useWorkflowSaveStore();

			const mockWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: mockWorkflowState as WorkflowState,
			});

			// Simulate a save already in progress
			let resolvePendingSave: ((value: boolean) => void) | undefined;
			const pendingPromise = new Promise<boolean>((resolve) => {
				resolvePendingSave = resolve;
			});
			saveStore.setPendingSave(pendingPromise);

			// Try to run autosave while another save is in progress
			const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			// Should return true (skipped, not failed)
			expect(result).toBe(true);

			// updateWorkflow should NOT have been called since we skipped
			expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled();

			// Clean up pending promise
			if (resolvePendingSave) {
				resolvePendingSave(true);
			}
			await pendingPromise;
		});

		it('should wait for pending autosave when manual save is triggered', async () => {
			const workflow = createTestWorkflow({
				id: 'w-manual-waits',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);

			// Mock first save to block until we manually resolve it
			let resolveAutosave:
				| ((value: typeof workflow & { checksum: string; versionId: string }) => void)
				| undefined;
			const blockedPromise = new Promise<typeof workflow & { checksum: string; versionId: string }>(
				(resolve) => {
					resolveAutosave = resolve;
				},
			);

			const updateWorkflowSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockImplementationOnce(async () => await blockedPromise)
				.mockResolvedValueOnce({
					...workflow,
					checksum: 'test-checksum-manual',
					versionId: 'v2',
				});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const testWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: testWorkflowState as WorkflowState,
			});

			// Start autosave
			const autosavePromise = saveCurrentWorkflow({ id: workflow.id }, true, false, true);
			await Promise.resolve();

			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);

			// Trigger manual save while autosave is still running
			const manualSavePromise = saveCurrentWorkflow({ id: workflow.id }, true, false, false);
			await Promise.resolve();

			// Manual save should wait - still only 1 call to updateWorkflow
			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);

			// Complete the autosave
			if (resolveAutosave) {
				resolveAutosave({
					...workflow,
					checksum: 'test-checksum-auto',
					versionId: 'v1',
				});
			}

			await autosavePromise;
			const manualResult = await manualSavePromise;

			// Now manual save should have completed
			expect(manualResult).toBe(true);
			expect(updateWorkflowSpy).toHaveBeenCalledTimes(2);
		});

		it('should NOT wait for pending save when forceSave is true', async () => {
			const workflow = createTestWorkflow({
				id: 'w-force-save',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			const updateWorkflowSpy = vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
				versionId: 'v1',
			});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const saveStore = useWorkflowSaveStore();

			const testWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: testWorkflowState as WorkflowState,
			});

			// Simulate a save already in progress
			let resolvePendingSave: ((value: boolean) => void) | undefined;
			const pendingPromise = new Promise<boolean>((resolve) => {
				resolvePendingSave = resolve;
			});
			saveStore.setPendingSave(pendingPromise);

			// Force save should bypass the wait
			const forceSavePromise = saveCurrentWorkflow({ id: workflow.id }, true, true, false);
			await Promise.resolve();

			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);

			// Force save should complete without waiting for pending promise
			const result = await forceSavePromise;
			expect(result).toBe(true);

			// Clean up pending promise
			if (resolvePendingSave) {
				resolvePendingSave(true);
			}
			await pendingPromise;
		});

		it('should properly cleanup pendingSave after save completes', async () => {
			const workflow = createTestWorkflow({
				id: 'w-cleanup',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);

			// Control when the save completes
			let resolveSave:
				| ((value: typeof workflow & { checksum: string; versionId: string }) => void)
				| undefined;
			const blockedPromise = new Promise<typeof workflow & { checksum: string; versionId: string }>(
				(resolve) => {
					resolveSave = resolve;
				},
			);

			vi.spyOn(workflowsStore, 'updateWorkflow').mockImplementation(
				async () => await blockedPromise,
			);

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const saveStore = useWorkflowSaveStore();

			const testWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: testWorkflowState as WorkflowState,
			});

			// Before save starts
			expect(saveStore.pendingSave).toBeNull();

			const savePromise = saveCurrentWorkflow({ id: workflow.id }, true, false, false);
			await Promise.resolve();

			// During save
			expect(saveStore.pendingSave).toBeTruthy();

			// Complete the save
			if (resolveSave) {
				resolveSave({
					...workflow,
					checksum: 'test-checksum',
					versionId: 'v1',
				});
			}

			await savePromise;

			// After save completes
			expect(saveStore.pendingSave).toBeNull();
		});

		it('should handle consecutive autosave and manual save correctly', async () => {
			const workflow = createTestWorkflow({
				id: 'w-consecutive',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);

			// Track execution order to verify manual save waits for autosave
			const callOrder: string[] = [];

			let resolveAutosave1:
				| ((value: typeof workflow & { checksum: string; versionId: string }) => void)
				| undefined;
			const blockedPromise = new Promise<typeof workflow & { checksum: string; versionId: string }>(
				(resolve) => {
					resolveAutosave1 = resolve;
				},
			);

			const updateWorkflowSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockImplementationOnce(async () => {
					callOrder.push('autosave1-start');
					const result = await blockedPromise;
					callOrder.push('autosave1-complete');
					return result;
				})
				.mockImplementationOnce(async () => {
					await Promise.resolve();
					callOrder.push('manual-save');
					return {
						...workflow,
						checksum: 'test-checksum-manual',
						versionId: 'v2',
					};
				});

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const saveStore = useWorkflowSaveStore();

			const testWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: testWorkflowState as WorkflowState,
			});

			// Start first autosave
			const autosave1Promise = saveCurrentWorkflow({ id: workflow.id }, true, false, true);
			await Promise.resolve();

			expect(callOrder).toContain('autosave1-start');
			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);

			// Second autosave while first is running should be skipped
			const autosave2Promise = saveCurrentWorkflow({ id: workflow.id }, true, false, true);
			const autosave2Result = await autosave2Promise;
			expect(autosave2Result).toBe(true);
			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);

			// Manual save while autosave is running should wait
			const manualSavePromise = saveCurrentWorkflow({ id: workflow.id }, true, false, false);
			await Promise.resolve();

			expect(updateWorkflowSpy).toHaveBeenCalledTimes(1);
			expect(callOrder).not.toContain('manual-save');

			// Complete the first autosave
			if (resolveAutosave1) {
				resolveAutosave1({
					...workflow,
					checksum: 'test-checksum-auto',
					versionId: 'v1',
				});
			}

			await autosave1Promise;
			const manualSaveResult = await manualSavePromise;

			// Verify ordering: autosave completes before manual save starts
			expect(manualSaveResult).toBe(true);
			expect(callOrder).toEqual(['autosave1-start', 'autosave1-complete', 'manual-save']);
			expect(updateWorkflowSpy).toHaveBeenCalledTimes(2);
			expect(saveStore.pendingSave).toBeNull();
		});

		it('should handle manual save failure and cleanup pendingSave', async () => {
			const workflow = createTestWorkflow({
				id: 'w-failure',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockRejectedValue(new Error('Network error'));

			workflowsStore.setWorkflow(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.workflowId = workflow.id;

			const saveStore = useWorkflowSaveStore();

			const testWorkflowState: Partial<WorkflowState> = {
				setWorkflowName: vi.fn(),
				setWorkflowProperty: vi.fn(),
			};

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
				workflowState: testWorkflowState as WorkflowState,
			});

			const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, false);

			expect(result).toBe(false);
			expect(saveStore.pendingSave).toBeNull();
		});

		it('should handle autosave failure with retry behavior', async () => {
			vi.useFakeTimers();

			try {
				const workflow = createTestWorkflow({
					id: 'w-autosave-failure',
					nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
					active: true,
				});

				vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
				const errorMessage = 'Network timeout';
				vi.spyOn(workflowsStore, 'updateWorkflow').mockRejectedValue(new Error(errorMessage));

				workflowsStore.setWorkflow(workflow);
				workflowsListStore.workflowsById = { [workflow.id]: workflow };
				workflowsStore.workflowId = workflow.id;

				const saveStore = useWorkflowSaveStore();
				const initialRetryCount = saveStore.retryCount;

				const testWorkflowState: Partial<WorkflowState> = {
					setWorkflowName: vi.fn(),
					setWorkflowProperty: vi.fn(),
				};

				const { saveCurrentWorkflow } = useWorkflowSaving({
					router,
					workflowState: testWorkflowState as WorkflowState,
				});

				const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

				// Verify autosave failure triggers retry logic
				expect(result).toBe(false);
				expect(saveStore.pendingSave).toBeNull();
				expect(saveStore.retryCount).toBe(initialRetryCount + 1);
				expect(saveStore.lastError).toBe(errorMessage);
				expect(saveStore.isRetrying).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		});

		it('should not schedule autosave when network is offline', () => {
			const saveStore = useWorkflowSaveStore();

			backendConnectionStore.setOnline(false);
			saveStore.reset();

			const { autoSaveWorkflow } = useWorkflowSaving({ router });

			autoSaveWorkflow();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});
	});
});
