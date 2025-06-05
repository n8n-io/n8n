import { useUIStore } from '@/stores/ui.store';
import { MODAL_CANCEL, MODAL_CONFIRM, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { useWorkflowSaving } from './useWorkflowSaving';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IWorkflowDataUpdate } from '@/Interface';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

const modalConfirmSpy = vi.fn();
const saveCurrentWorkflowSpy = vi.fn();

vi.mock('@/composables/useMessage', () => {
	return {
		useMessage: () => ({
			confirm: modalConfirmSpy,
		}),
	};
});

vi.mock('@/composables/useWorkflowHelpers', () => {
	return {
		useWorkflowHelpers: () => ({
			saveCurrentWorkflow: saveCurrentWorkflowSpy,
		}),
	};
});

const getDuplicateTestWorkflow = (): IWorkflowDataUpdate => ({
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
	describe('promptSaveUnsavedWorkflowChanges', () => {
		beforeAll(() => {
			setActivePinia(createTestingPinia());
		});

		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should prompt the user to save changes and proceed if confirmed', async () => {
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn().mockResolvedValue(true);
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			const npsSurveyStore = useNpsSurveyStore();
			vi.spyOn(npsSurveyStore, 'fetchPromptsData').mockResolvedValue();

			saveCurrentWorkflowSpy.mockResolvedValue(true);

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CONFIRM);

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(npsSurveyStore.fetchPromptsData).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).toHaveBeenCalledWith({}, false);
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(true);
			expect(cancel).not.toHaveBeenCalled();
		});

		it('should not proceed if the user cancels the confirmation modal', async () => {
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CANCEL);

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith();
		});

		it('should restore the route if the modal is closed and the workflow is not new', async () => {
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			const workflowStore = useWorkflowsStore();
			const MOCK_ID = 'existing-workflow-id';
			workflowStore.workflow.id = MOCK_ID;

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue('close');

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

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
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			const workflowStore = useWorkflowsStore();
			workflowStore.workflow.id = PLACEHOLDER_EMPTY_WORKFLOW_ID;

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue('close');

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(true);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it('should proceed without prompting if there are no unsaved changes', async () => {
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = false;

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).not.toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).not.toHaveBeenCalled();
			expect(uiStore.stateIsDirty).toEqual(false);

			expect(confirm).not.toHaveBeenCalled();
			expect(cancel).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith();
		});

		it('should handle save failure and restore the route', async () => {
			const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
			const next = vi.fn();
			const confirm = vi.fn();
			const cancel = vi.fn();

			// Mock state
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			const workflowStore = useWorkflowsStore();
			const MOCK_ID = 'existing-workflow-id';
			workflowStore.workflow.id = MOCK_ID;

			saveCurrentWorkflowSpy.mockResolvedValue(false);

			// Mock message.confirm
			modalConfirmSpy.mockResolvedValue(MODAL_CONFIRM);

			await promptSaveUnsavedWorkflowChanges(next, { confirm, cancel });

			expect(modalConfirmSpy).toHaveBeenCalled();
			expect(saveCurrentWorkflowSpy).toHaveBeenCalledWith({}, false);
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
	});
	describe('saveCurrentWorkflow', () => {
		let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

		beforeAll(() => {
			setActivePinia(createTestingPinia());
			workflowsStore = mockedStore(useWorkflowsStore);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});
		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));

			workflowsStore = mockedStore(useWorkflowsStore);
		});

		it('should save the current workflow', async () => {
			const workflow = createTestWorkflow({
				id: 'w0',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: false })],
				active: true,
			});

			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w0' });
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w0',
				expect.objectContaining({ id: 'w0', active: true }),
				false,
			);
		});

		it('should include active=false in the request if the workflow has no activatable trigger node', async () => {
			const workflow = createTestWorkflow({
				id: 'w1',
				nodes: [createTestNode({ type: CHAT_TRIGGER_NODE_TYPE, disabled: true })],
				active: true,
			});

			vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue(workflow);
			vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValue(workflow);

			workflowsStore.setWorkflow(workflow);

			const { saveCurrentWorkflow } = useWorkflowSaving({ router });
			await saveCurrentWorkflow({ id: 'w1' });
			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				'w1',
				expect.objectContaining({ id: 'w1', active: false }),
				false,
			);
			expect(workflowsStore.setWorkflowInactive).toHaveBeenCalled();
		});
	});
});
