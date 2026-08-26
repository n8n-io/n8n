import { computed, defineComponent, h, nextTick, provide } from 'vue';
import { mount } from '@vue/test-utils';
import { useUIStore } from '@/app/stores/ui.store';
import { AutoSaveState, DEBOUNCE_TIME, MODAL_CANCEL, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import {
	EditorEnabledFeaturesKey,
	WorkflowIdKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useWorkflowSaving } from './useWorkflowSaving';
import router from '@/app/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { ResponseError } from '@n8n/rest-api-client';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { CHAT_TRIGGER_NODE_TYPE, NodeConnectionTypes } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

function setDocumentStoreActive(workflowId: string) {
	useWorkflowDocumentStore(createWorkflowDocumentId(workflowId)).setActiveState({
		activeVersionId: 'v1',
		activeVersion: {
			versionId: 'v1',
			authors: '',
			createdAt: '',
			updatedAt: '',
			workflowPublishHistory: [],
			name: null,
			description: null,
		},
	});
}

const modalConfirmSpy = vi.fn();

vi.mock('@/app/composables/useMessage', () => {
	return {
		useMessage: () => ({
			confirm: modalConfirmSpy,
		}),
	};
});

const showMessageSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: showMessageSpy,
		showToast: vi.fn(() => ({ close: vi.fn() })),
		showError: vi.fn(),
		clearAllStickyNotifications: vi.fn(),
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({
		workflow: { update: true },
	}),
}));

const mockRoute = { name: 'NodeViewExisting', params: {} as Record<string, string>, query: {} };

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => mockRoute,
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
		mockRoute.params = {};
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

	function prepareHydratedWorkflow(workflowId: string) {
		const workflow = createTestWorkflow({
			id: workflowId,
			nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
		});
		mockRoute.params = { workflowId };
		workflowsStore.setWorkflowId(workflowId);
		workflowsListStore.workflowsById = {
			...workflowsListStore.workflowsById,
			[workflowId]: workflow,
		};
		const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		documentStore.hydrate(workflow);

		return { workflow, documentStore };
	}

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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);
			mockRoute.params = { workflowId: workflow.id };

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

			const resolveSpy = vi.fn();
			const resolveMarker = Symbol();
			resolveSpy.mockReturnValue(resolveMarker);
			const mockRouter = {
				resolve: resolveSpy,
				currentRoute: {
					value: { params: { workflowId: workflow.id }, query: { parentFolderId: '' } },
				},
			};

			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({
				router: mockRouter as never,
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

		it('cancels a scheduled autosave when the user discards changes', async () => {
			vi.useFakeTimers();
			try {
				const { workflow } = prepareHydratedWorkflow('w-discard-cancel-autosave');
				const updateSpy = vi
					.spyOn(workflowsStore, 'updateWorkflow')
					.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });
				const next = vi.fn();
				const confirm = vi.fn();
				const cancel = vi.fn();
				const uiStore = useUIStore();
				const saveStore = useWorkflowSaveStore();

				uiStore.markStateDirty();
				modalConfirmSpy.mockResolvedValue(MODAL_CANCEL);

				const workflowSaving = useWorkflowSaving({ router, ownsAutoSave: true });
				workflowSaving.autoSaveWorkflow();

				expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

				await workflowSaving.promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

				expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
				expect(uiStore.stateIsDirty).toBe(false);

				await vi.advanceTimersByTimeAsync(
					getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) + 1000,
				);

				expect(updateSpy).not.toHaveBeenCalled();
				expect(next).toHaveBeenCalledWith();
			} finally {
				vi.useRealTimers();
			}
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
			workflowStore.setWorkflowId(MOCK_ID);
			mockRoute.params = { workflowId: MOCK_ID };
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
					params: { workflowId: MOCK_ID },
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
			workflowStore.setWorkflowId('');

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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			// Populate workflowsById to mark workflow as existing (not new)
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			mockRoute.params = { workflowId: workflow.id };

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
				currentRoute: {
					value: { params: { workflowId: workflow.id }, query: { parentFolderId: '' } },
				},
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
		it('syncs backend-seeded settings (e.g. availableInMCP) into the document after create', async () => {
			const workflow = getDuplicateTestWorkflow();
			const created = createTestWorkflow({
				id: 'new-wf-id',
				settings: { executionOrder: 'v1', availableInMCP: true },
			});
			vi.spyOn(workflowsStore, 'createNewWorkflow').mockResolvedValue(created);

			const { saveAsNewWorkflow } = useWorkflowSaving({ router });
			await saveAsNewWorkflow({ name: workflow.name, data: workflow });

			const snapshot = useWorkflowDocumentStore(
				createWorkflowDocumentId(created.id),
			).getSettingsSnapshot();
			expect(snapshot.availableInMCP).toBe(true);
		});

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

		it('should remap nodeGroups nodeIds when resetNodeIds is true', async () => {
			const oldId1 = 'old-id-1';
			const oldId2 = 'old-id-2';
			const workflow: WorkflowDataUpdate = {
				name: 'Grouped workflow',
				active: false,
				nodes: [
					{
						parameters: {},
						id: oldId1,
						name: 'Node 1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						parameters: {},
						id: oldId2,
						name: 'Node 2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
				nodeGroups: [{ id: 'group-1', name: 'My Group', nodeIds: [oldId1, oldId2] }],
			};

			const { saveAsNewWorkflow } = useWorkflowSaving({ router });

			await saveAsNewWorkflow({
				name: workflow.name,
				resetNodeIds: true,
				data: workflow,
			});

			// Node IDs should have been reassigned
			const newId1 = workflow.nodes![0].id;
			const newId2 = workflow.nodes![1].id;
			expect(newId1).not.toBe(oldId1);
			expect(newId2).not.toBe(oldId2);

			// nodeGroups should reference the new IDs
			expect(workflow.nodeGroups).toEqual([
				{ id: 'group-1', name: 'My Group', nodeIds: [newId1, newId2] },
			]);
		});

		// CAT-3966: the Trello Trigger's webhook path comes from its node description, not
		// from a `path` parameter, so resetting webhook URLs must not add one.
		it('should not invent a `path` parameter on a trigger that does not have one', async () => {
			const workflow: WorkflowDataUpdate = {
				name: 'Trello duplicate test',
				active: false,
				nodes: [
					createTestNode({
						name: 'Trello Trigger',
						type: 'n8n-nodes-base.trelloTrigger',
						parameters: { authentication: 'apiKey', id: '4d5ea62fd76aa1136000000c' },
						webhookId: 'original-node-webhook-id',
					}),
				],
				connections: {},
			};

			const { saveAsNewWorkflow } = useWorkflowSaving({ router });

			await saveAsNewWorkflow({
				name: workflow.name,
				resetWebhookUrls: true,
				data: workflow,
			});

			expect(workflow.nodes![0].webhookId).not.toBe('original-node-webhook-id');
			expect(workflow.nodes![0].parameters).not.toHaveProperty('path');
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			setDocumentStoreActive(workflow.id);

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w0' });
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w0',
				expect.objectContaining({ id: 'w0', active: true }),
				false,
			);
		});

		it('allows a manual save before the document is marked hydrated', async () => {
			const workflow = createTestWorkflow({
				id: 'w-manual-unhydrated',
				name: 'Manual unhydrated workflow',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});

			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflowId(workflow.id);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
			documentStore.setName(workflow.name);
			documentStore.setNodes(workflow.nodes);
			documentStore.setConnections(workflow.connections);

			expect(documentStore.hydrated).toBe(false);

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			const saved = await saveCurrentWorkflow({ id: workflow.id }, true, false, false);

			expect(saved).toBe(true);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				workflow.id,
				expect.objectContaining({ id: workflow.id, name: workflow.name }),
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { w2: workflow };
			workflowsStore.isWorkflowSaved = { w2: true };
			setDocumentStoreActive(workflow.id);

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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { w3: workflow };
			workflowsStore.isWorkflowSaved = { w3: true };
			setDocumentStoreActive(workflow.id);

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w3' }, true, false, false);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w3',
				expect.objectContaining({ id: 'w3', active: true, autosaved: false }),
				false,
			);
		});

		it('should include tags when saving workflow', async () => {
			const workflowId = 'w5';
			const tagIds = ['tag1', 'tag2'];

			const workflow = createTestWorkflow({
				id: workflowId,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			// Tags are now managed by workflowDocumentStore, not workflowState
			const documentId = createWorkflowDocumentId(workflowId);
			const workflowDocumentStore = useWorkflowDocumentStore(documentId);
			workflowDocumentStore.setTags(tagIds);

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
			});

			await saveCurrentWorkflow({ id: workflowId }, true, false, false);

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				workflowId,
				expect.objectContaining({ tags: tagIds }),
				false,
			);
		});

		it('should remove invalid node groups before saving and warn the user', async () => {
			const workflow = createTestWorkflow({
				id: 'w6',
				nodes: [
					createTestNode({ id: 'node-a', name: 'Node A' }),
					createTestNode({ id: 'node-b', name: 'Node B' }),
					createTestNode({ id: 'node-c', name: 'Node C' }),
				],
				connections: {
					'Node A': {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
				// Node C is not connected to the rest of the group, so the members
				// do not form a connected subgraph and the grouping rules reject it
				nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b', 'node-c'] }],
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflowId(workflow.id);
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
			documentStore.hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			const saved = await saveCurrentWorkflow({ id: 'w6' });

			expect(saved).toBe(true);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w6',
				expect.objectContaining({ nodeGroups: [] }),
				false,
			);
			expect(documentStore.allGroups).toHaveLength(0);
			expect(showMessageSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					title: 'Groups removed',
					message: expect.stringContaining('<li>Group 1</li>'),
				}),
			);
		});

		it('should keep valid node groups in the save payload', async () => {
			const workflow = createTestWorkflow({
				id: 'w7',
				nodes: [
					createTestNode({ id: 'node-a', name: 'Node A' }),
					createTestNode({ id: 'node-b', name: 'Node B' }),
				],
				connections: {
					'Node A': {
						[NodeConnectionTypes.Main]: [
							[{ node: 'Node B', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
				nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b'] }],
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflowId(workflow.id);
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
			documentStore.hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			const saved = await saveCurrentWorkflow({ id: 'w7' });

			expect(saved).toBe(true);
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w7',
				expect.objectContaining({
					nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-a', 'node-b'] }],
				}),
				false,
			);
			expect(documentStore.allGroups).toHaveLength(1);
			expect(showMessageSpy).not.toHaveBeenCalled();
		});
	});

	describe('autoSaveWorkflow', () => {
		it('should not schedule autosave if a save is already in progress', () => {
			prepareHydratedWorkflow('w-pending-save');
			const saveStore = useWorkflowSaveStore();

			// Simulate an ongoing save by setting pendingSave
			const mockPendingSave = new Promise<boolean>(() => {});
			saveStore.setPendingSave(mockPendingSave);

			const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

			// Try to schedule autosave
			autoSaveWorkflow();

			// Should not have scheduled (state should still be Idle, not Scheduled)
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});

		it('should schedule autosave when state is Idle', () => {
			prepareHydratedWorkflow('w-schedule');
			const saveStore = useWorkflowSaveStore();

			// Ensure state is Idle
			saveStore.reset();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);

			const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const uiStore = useUIStore();
			const saveStore = useWorkflowSaveStore();

			uiStore.markStateDirty();
			const initialDirtyCount = uiStore.dirtyStateSetCount;

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const uiStore = useUIStore();

			// Mark state as dirty
			uiStore.markStateDirty();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
			});

			// Save without making any changes during save
			await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			// After save, state should be clean
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should disarm a scheduled autosave when a manual save completes clean', async () => {
			const workflow = createTestWorkflow({
				id: 'w-autosave-disarm',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue({
				...workflow,
				checksum: 'test-checksum',
			});

			workflowsStore.setWorkflowId(workflow.id);
			mockRoute.params = { workflowId: workflow.id };
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const uiStore = useUIStore();
			const saveStore = useWorkflowSaveStore();
			saveStore.reset();

			const { saveCurrentWorkflow, autoSaveWorkflow } = useWorkflowSaving({
				router,
				ownsAutoSave: true,
			});

			// Dirty workflow with an armed autosave timer, then a manual save
			// (e.g. save-then-navigate flows). Without the disarm, the timer
			// fires after navigation with no workflow context and attempts to
			// create an empty workflow.
			uiStore.markStateDirty();
			autoSaveWorkflow();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

			await saveCurrentWorkflow({ id: workflow.id }, false);

			expect(uiStore.stateIsDirty).toBe(false);
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const saveStore = useWorkflowSaveStore();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const saveStore = useWorkflowSaveStore();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const saveStore = useWorkflowSaveStore();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const saveStore = useWorkflowSaveStore();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			workflowsStore.setWorkflowId(workflow.id);

			const saveStore = useWorkflowSaveStore();

			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
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

				workflowsStore.setWorkflowId(workflow.id);
				useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
				workflowsListStore.workflowsById = { [workflow.id]: workflow };
				workflowsStore.setWorkflowId(workflow.id);

				const saveStore = useWorkflowSaveStore();
				const initialRetryCount = saveStore.retryCount;

				const { saveCurrentWorkflow } = useWorkflowSaving({
					router,
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

		it('retries autosaved create failures that can recover', async () => {
			vi.useFakeTimers();

			try {
				const newWorkflowId = 'w-autosave-create-failure';
				const errorMessage = 'Network timeout';
				const workflow = createTestWorkflow({
					id: newWorkflowId,
					name: 'Named new workflow',
					nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				});

				vi.spyOn(workflowsStore, 'createNewWorkflow').mockRejectedValue(new Error(errorMessage));

				mockRoute.params = { workflowId: newWorkflowId };
				useWorkflowDocumentStore(createWorkflowDocumentId(newWorkflowId)).hydrate(workflow);

				const saveStore = useWorkflowSaveStore();
				const { saveCurrentWorkflow } = useWorkflowSaving({
					router,
				});

				const result = await saveCurrentWorkflow({}, true, false, true);

				expect(result).toBe(false);
				expect(saveStore.pendingSave).toBeNull();
				expect(saveStore.retryCount).toBe(1);
				expect(saveStore.lastError).toBe(errorMessage);
				expect(saveStore.isRetrying).toBe(true);
				expect(showMessageSpy).toHaveBeenCalledTimes(1);
				expect(showMessageSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						message: expect.stringContaining(errorMessage),
						type: 'error',
					}),
				);
			} finally {
				vi.useRealTimers();
			}
		});

		it('does not retry autosaved create when a post-create step fails', async () => {
			vi.useFakeTimers();
			const newWorkflowId = 'w-autosave-create-post-create-failure';
			const createdWorkflow = createTestWorkflow({
				id: 'w-autosave-created-before-post-create-failure',
				name: 'Named new workflow',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createdWorkflow);
			const focusPanelSpy = vi
				.spyOn(useFocusPanelStore(), 'onNewWorkflowSave')
				.mockImplementation(() => {
					throw new Error('Focus panel failed');
				});
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			try {
				mockRoute.params = { workflowId: newWorkflowId };
				useWorkflowDocumentStore(createWorkflowDocumentId(newWorkflowId)).hydrate(
					createTestWorkflow({
						id: newWorkflowId,
						name: 'Named new workflow',
						nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
					}),
				);

				const saveStore = useWorkflowSaveStore();
				const { saveCurrentWorkflow } = useWorkflowSaving({
					router,
				});

				const result = await saveCurrentWorkflow({}, true, false, true);
				await vi.advanceTimersByTimeAsync(saveStore.getRetryDelay() + 1);

				expect(result).toBe(false);
				expect(createSpy).toHaveBeenCalledTimes(1);
				expect(workflowsListStore.getWorkflowById(createdWorkflow.id)).toEqual(createdWorkflow);
				expect(saveStore.retryCount).toBe(0);
				expect(saveStore.isRetrying).toBe(false);
				expect(saveStore.lastError).toBeNull();
				expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
			} finally {
				focusPanelSpy.mockRestore();
				consoleErrorSpy.mockRestore();
				vi.useRealTimers();
			}
		});

		it('does not retry autosave after a permanent client error', async () => {
			const workflow = createTestWorkflow({
				id: 'w-autosave-client-error',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});
			const errorMessage = 'Workflow name is required';

			vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockRejectedValue(
				new ResponseError(errorMessage, { httpStatusCode: 400 }),
			);

			workflowsStore.setWorkflowId(workflow.id);
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			workflowsListStore.workflowsById = { [workflow.id]: workflow };

			const saveStore = useWorkflowSaveStore();
			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
			});

			const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			expect(result).toBe(false);
			expect(saveStore.pendingSave).toBeNull();
			expect(saveStore.retryCount).toBe(0);
			expect(saveStore.isRetrying).toBe(false);
			expect(saveStore.lastError).toBe(errorMessage);
		});

		it('uses raw object messages for autosave errors that are not Error instances', async () => {
			const { workflow } = prepareHydratedWorkflow('w-autosave-raw-node-api-error');
			const errorMessage = 'Node API request failed';

			vi.spyOn(workflowsStore, 'updateWorkflow').mockRejectedValue({
				name: 'NodeApiError',
				message: errorMessage,
				errorCode: 400,
			});

			const saveStore = useWorkflowSaveStore();
			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
			});

			const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			expect(result).toBe(false);
			expect(saveStore.retryCount).toBe(0);
			expect(saveStore.isRetrying).toBe(false);
			expect(saveStore.lastError).toBe(errorMessage);
			expect(showMessageSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					message: errorMessage,
					type: 'error',
				}),
			);
		});

		it('does not retry autosave after a raw axios permanent client error', async () => {
			const { workflow } = prepareHydratedWorkflow('w-autosave-raw-axios-error');
			const errorMessage = 'Request failed with status code 413';

			vi.spyOn(workflowsStore, 'updateWorkflow').mockRejectedValue(
				Object.assign(new Error(errorMessage), {
					response: {
						status: 413,
					},
				}),
			);

			const saveStore = useWorkflowSaveStore();
			const { saveCurrentWorkflow } = useWorkflowSaving({
				router,
			});

			const result = await saveCurrentWorkflow({ id: workflow.id }, true, false, true);

			expect(result).toBe(false);
			expect(saveStore.retryCount).toBe(0);
			expect(saveStore.isRetrying).toBe(false);
			expect(saveStore.lastError).toBe(errorMessage);
		});

		it('does not immediately re-arm debounced autosave after a permanent client error', async () => {
			vi.useFakeTimers();

			try {
				mockedStore(useSettingsStore).isAutosaveEnabled = true;
				prepareHydratedWorkflow('w-autosave-client-error-debounced');
				const updateSpy = vi
					.spyOn(workflowsStore, 'updateWorkflow')
					.mockRejectedValue(
						new ResponseError('Workflow name is required', { httpStatusCode: 400 }),
					);
				const saveStore = useWorkflowSaveStore();
				const uiStore = useUIStore();

				uiStore.markStateDirty();

				const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

				autoSaveWorkflow();
				expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

				await vi.advanceTimersByTimeAsync(
					getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) + 1000,
				);

				expect(updateSpy).toHaveBeenCalledTimes(1);
				expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
				expect(saveStore.retryCount).toBe(0);
				expect(saveStore.isRetrying).toBe(false);
				expect(uiStore.stateIsDirty).toBe(true);

				await vi.advanceTimersByTimeAsync(
					getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) + 1000,
				);

				expect(updateSpy).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});

		it('should not schedule autosave when network is offline', () => {
			prepareHydratedWorkflow('w-offline');
			const saveStore = useWorkflowSaveStore();

			backendConnectionStore.setOnline(false);
			saveStore.reset();

			const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

			autoSaveWorkflow();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});

		it('should not schedule autosave when autosave is disabled via environment variable', () => {
			prepareHydratedWorkflow('w-disabled');
			const autosaveStore = useWorkflowSaveStore();
			const settingsStore = mockedStore(useSettingsStore);

			// Mock isAutosaveEnabled to return false (simulating N8N_WORKFLOWS_AUTOSAVE_DISABLED=true)
			settingsStore.isAutosaveEnabled = false;

			autosaveStore.reset();
			expect(autosaveStore.autoSaveState).toBe(AutoSaveState.Idle);

			const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

			// Try to schedule autosave while disabled
			autoSaveWorkflow();

			// State should remain Idle, not Scheduled
			expect(autosaveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});

		it('should schedule autosave when autosave is enabled via environment variable', () => {
			prepareHydratedWorkflow('w-enabled');
			const autosaveStore = useWorkflowSaveStore();
			const settingsStore = mockedStore(useSettingsStore);

			// Mock isAutosaveEnabled to return true (default behavior)
			settingsStore.isAutosaveEnabled = true;

			autosaveStore.reset();
			expect(autosaveStore.autoSaveState).toBe(AutoSaveState.Idle);

			const { autoSaveWorkflow } = useWorkflowSaving({ router, ownsAutoSave: true });

			// Schedule autosave
			autoSaveWorkflow();

			// State should be Scheduled
			expect(autosaveStore.autoSaveState).toBe(AutoSaveState.Scheduled);
		});
	});

	describe('autosave document hydration gate', () => {
		const EDITABLE_FEATURES: EditorEnabledFeatures = {
			readOnly: false,
			expandGroups: 'all',
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
		};

		const probe: { current: ReturnType<typeof useWorkflowSaving> | null } = { current: null };

		const AutosaveProbe = defineComponent({
			name: 'AutosaveHydrationProbe',
			setup() {
				probe.current = useWorkflowSaving({ router, ownsAutoSave: true });
				return () => h('div');
			},
		});

		const AutosaveHostStub = defineComponent({
			name: 'AutosaveHydrationHostStub',
			props: {
				workflowId: { type: String, required: true },
			},
			setup(props) {
				provide(
					WorkflowIdKey,
					computed(() => props.workflowId),
				);
				provide(
					EditorEnabledFeaturesKey,
					computed<EditorEnabledFeatures>(() => EDITABLE_FEATURES),
				);
				return () => h(AutosaveProbe);
			},
		});

		function takeProbe(): ReturnType<typeof useWorkflowSaving> {
			const saving = probe.current;
			if (!saving) throw new Error('AutosaveHydrationProbe did not initialise');
			return saving;
		}

		function mountAutosaveHost(workflowId: string) {
			probe.current = null;
			const wrapper = mount(AutosaveHostStub, { props: { workflowId } });
			return { wrapper, saving: takeProbe() };
		}

		async function flushAutoSave() {
			await vi.advanceTimersByTimeAsync(
				getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) + 1000,
			);
		}

		beforeEach(() => {
			vi.useFakeTimers();
			mockedStore(useSettingsStore).isAutosaveEnabled = true;
			useWorkflowSaveStore().reset();
			useUIStore().markStateDirty();
		});

		afterEach(() => {
			vi.useRealTimers();
			probe.current = null;
		});

		it('defers scheduling while the current workflow document is not hydrated', async () => {
			const workflow = createTestWorkflow({
				id: 'w-hydration-pending',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createTestWorkflow({ id: 'created' }));
			const saveStore = useWorkflowSaveStore();
			const uiStore = useUIStore();

			const { saving } = mountAutosaveHost(workflow.id);

			saving.autoSaveWorkflow();
			await flushAutoSave();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
			expect(saveStore.retryCount).toBe(0);
			expect(uiStore.stateIsDirty).toBe(true);
			expect(updateSpy).not.toHaveBeenCalled();
			expect(createSpy).not.toHaveBeenCalled();
		});

		it('drops a scheduled autosave if navigation lands on an unhydrated document before it fires', async () => {
			const workflow = createTestWorkflow({
				id: 'w-hydrated-first',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createTestWorkflow({ id: 'created' }));
			const saveStore = useWorkflowSaveStore();

			const { wrapper, saving } = mountAutosaveHost(workflow.id);

			saving.autoSaveWorkflow();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

			await wrapper.setProps({ workflowId: 'w-unhydrated-next' });
			await flushAutoSave();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
			expect(saveStore.retryCount).toBe(0);
			expect(useUIStore().stateIsDirty).toBe(true);
			expect(updateSpy).not.toHaveBeenCalled();
			expect(createSpy).not.toHaveBeenCalled();
		});

		it('drops a scheduled autosave if state becomes clean before it fires', async () => {
			const workflow = createTestWorkflow({
				id: 'w-clean-before-fire',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createTestWorkflow({ id: 'created' }));
			const saveStore = useWorkflowSaveStore();
			const uiStore = useUIStore();

			const { saving } = mountAutosaveHost(workflow.id);

			saving.autoSaveWorkflow();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

			uiStore.markStateClean();
			await flushAutoSave();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
			expect(saveStore.retryCount).toBe(0);
			expect(uiStore.stateIsDirty).toBe(false);
			expect(updateSpy).not.toHaveBeenCalled();
			expect(createSpy).not.toHaveBeenCalled();
		});

		it('re-arms autosave when an existing workflow document becomes hydrated while dirty', async () => {
			const workflow = createTestWorkflow({
				id: 'w-hydration-rearm',
				name: 'Hydrated workflow',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
			const saveStore = useWorkflowSaveStore();

			const { saving } = mountAutosaveHost(workflow.id);

			saving.autoSaveWorkflow();
			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);

			documentStore.hydrate(workflow);
			await nextTick();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

			await flushAutoSave();

			expect(updateSpy).toHaveBeenCalledWith(
				workflow.id,
				expect.objectContaining({
					name: workflow.name,
					nodes: expect.arrayContaining([
						expect.objectContaining({ name: workflow.nodes[0].name }),
					]),
				}),
				false,
			);
		});

		it('creates a new workflow by autosave only after the new document is hydrated', async () => {
			const newWorkflowId = 'w-new-hydration';
			const createdWorkflow = createTestWorkflow({
				id: 'w-created-from-autosave',
				name: 'Named new workflow',
			});
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createdWorkflow);
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(newWorkflowId));
			const saveStore = useWorkflowSaveStore();

			const { saving } = mountAutosaveHost(newWorkflowId);

			saving.autoSaveWorkflow();
			await flushAutoSave();

			expect(createSpy).not.toHaveBeenCalled();

			documentStore.setName('Named new workflow');
			documentStore.setHydrated(true);
			await nextTick();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);

			await flushAutoSave();

			expect(createSpy).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Named new workflow', autosaved: true }),
			);
		});
	});

	describe('autosave on a read-only preview canvas', () => {
		// Preview hosts (template, workflow history, execution) mount the real
		// NodeView and supersede the editor context with `readOnly: true`. Opening a
		// node there auto-selects a credential, which marks the document dirty and
		// reaches this composable — so the read-only signal has to stop the write.
		// Regression cover for ADO-5764.
		const PREVIEW_FEATURES: EditorEnabledFeatures = {
			readOnly: true,
			expandGroups: 'all',
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
		};

		const probe: { current: ReturnType<typeof useWorkflowSaving> | null } = { current: null };

		const AutosaveProbe = defineComponent({
			name: 'AutosaveProbe',
			setup() {
				// Stands in for NodeView: the canvas the host wraps, so it owns autosave.
				probe.current = useWorkflowSaving({ router, ownsAutoSave: true });
				return () => h('div');
			},
		});

		// Mirrors how WorkflowPreviewHost/ExecutionPreviewHost scope the subtree:
		// the host provides, the child (NodeView in production) injects.
		const PreviewHostStub = defineComponent({
			name: 'PreviewHostStub',
			props: {
				workflowId: { type: String, required: true },
				readOnly: { type: Boolean, required: true },
			},
			setup(props) {
				provide(
					WorkflowIdKey,
					computed(() => props.workflowId),
				);
				provide(
					EditorEnabledFeaturesKey,
					computed<EditorEnabledFeatures>(() => ({
						...PREVIEW_FEATURES,
						readOnly: props.readOnly,
					})),
				);
				return () => h(AutosaveProbe);
			},
		});

		function takeProbe(): ReturnType<typeof useWorkflowSaving> {
			const current = probe.current;
			if (!current) throw new Error('AutosaveProbe did not initialise');
			return current;
		}

		function mountPreview(workflowId: string, readOnly: boolean) {
			probe.current = null;
			mount(PreviewHostStub, { props: { workflowId, readOnly } });
			return takeProbe();
		}

		/** Drains the autosave debounce plus the in-flight save promise. */
		async function flushAutoSave() {
			await vi.advanceTimersByTimeAsync(
				getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE_MAX_WAIT) + 1000,
			);
		}

		beforeEach(() => {
			vi.useFakeTimers();
			mockedStore(useSettingsStore).isAutosaveEnabled = true;
			useWorkflowSaveStore().reset();
			useUIStore().markStateDirty();
		});

		afterEach(() => {
			vi.useRealTimers();
			probe.current = null;
		});

		it('issues no create request when a preview with no stored workflow goes dirty', async () => {
			// Template preview: the id is not in the list store, so the save path
			// falls through to "save as new" and POSTs a nameless workflow.
			const createSpy = vi
				.spyOn(workflowsStore, 'createNewWorkflow')
				.mockResolvedValue(createTestWorkflow({ id: 'created' }));

			const { autoSaveWorkflow } = mountPreview('template-11754', true);

			autoSaveWorkflow();
			await flushAutoSave();

			expect(createSpy).not.toHaveBeenCalled();
		});

		it('issues no update request when a preview of a stored workflow goes dirty', async () => {
			// Workflow history and execution previews resolve to the live workflow id,
			// so the save path PATCHes the real record.
			const workflow = createTestWorkflow({
				id: 'w-preview',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });

			const { autoSaveWorkflow } = mountPreview(workflow.id, true);

			autoSaveWorkflow();
			await flushAutoSave();

			expect(updateSpy).not.toHaveBeenCalled();
		});

		it('still saves when the same host is not read-only', async () => {
			// Control: proves the two assertions above fail for the right reason
			// rather than because this harness never reaches the request.
			const workflow = createTestWorkflow({
				id: 'w-editable',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
			});
			workflowsListStore.workflowsById = { [workflow.id]: workflow };
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
			const updateSpy = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });

			const { autoSaveWorkflow } = mountPreview(workflow.id, false);

			autoSaveWorkflow();
			await flushAutoSave();

			expect(updateSpy).toHaveBeenCalled();
		});

		it('does not re-arm a dirty preview when the connection comes back', async () => {
			// The reconnect watcher lives inside this composable, so it is the one
			// autosave entry point a view-level guard cannot cover.
			const saveStore = useWorkflowSaveStore();

			backendConnectionStore.setOnline(false);
			mountPreview('template-11754', true);
			useUIStore().markStateDirty();

			backendConnectionStore.setOnline(true);
			await nextTick();

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Idle);
		});

		it('re-arms a dirty canvas when the host lifts read-only', async () => {
			// Instance AI locks the canvas while its agent edits and then releases
			// it; without this the agent's changes would sit unsaved.
			const saveStore = useWorkflowSaveStore();
			const workflow = createTestWorkflow({ id: 'w-rearm' });
			useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);

			const wrapper = mount(PreviewHostStub, {
				props: { workflowId: workflow.id, readOnly: true },
			});
			useUIStore().markStateDirty();

			await wrapper.setProps({ readOnly: false });

			expect(saveStore.autoSaveState).toBe(AutoSaveState.Scheduled);
		});

		// The read-only signal is injected, so it only reaches an instance built
		// inside a preview host's subtree. `builder.store.ts` and the
		// `executionFinished` push handler build this composable out-of-tree, where
		// a host's provide is invisible — and every instance used to own a reconnect
		// watcher reading the app-wide dirty flag a preview sets. Cover from the
		// observable end: no request leaves a preview when the connection returns,
		// whatever else holds an instance.
		describe('with the composable also built out-of-tree', () => {
			it('issues no create request when the connection returns on a preview', async () => {
				const createSpy = vi
					.spyOn(workflowsStore, 'createNewWorkflow')
					.mockResolvedValue(createTestWorkflow({ id: 'created' }));

				backendConnectionStore.setOnline(false);
				useWorkflowSaving({ router });
				mountPreview('template-11754', true);
				useUIStore().markStateDirty();

				backendConnectionStore.setOnline(true);
				await nextTick();
				await flushAutoSave();

				expect(createSpy).not.toHaveBeenCalled();
			});

			it('issues no update request when the connection returns on a preview of a stored workflow', async () => {
				const workflow = createTestWorkflow({
					id: 'w-reconnect',
					nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				});
				workflowsListStore.workflowsById = { [workflow.id]: workflow };
				useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
				mockRoute.params = { workflowId: workflow.id };
				const updateSpy = vi
					.spyOn(workflowsStore, 'updateWorkflow')
					.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });

				backendConnectionStore.setOnline(false);
				useWorkflowSaving({ router });
				mountPreview(workflow.id, true);
				useUIStore().markStateDirty();

				backendConnectionStore.setOnline(true);
				await nextTick();
				await flushAutoSave();

				expect(updateSpy).not.toHaveBeenCalled();
			});

			it('still saves an editable canvas when the connection returns', async () => {
				// Control for the two above, and the regression risk of arming the
				// reconnect watcher on the canvas owner alone: offline edits still land.
				const workflow = createTestWorkflow({
					id: 'w-reconnect-editable',
					nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				});
				workflowsListStore.workflowsById = { [workflow.id]: workflow };
				useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
				mockRoute.params = { workflowId: workflow.id };
				const updateSpy = vi
					.spyOn(workflowsStore, 'updateWorkflow')
					.mockResolvedValue({ ...workflow, checksum: 'test-checksum' });

				backendConnectionStore.setOnline(false);
				useWorkflowSaving({ router });
				mountPreview(workflow.id, false);
				useUIStore().markStateDirty();

				backendConnectionStore.setOnline(true);
				await nextTick();
				await flushAutoSave();

				expect(updateSpy).toHaveBeenCalled();
			});
		});
	});
});
