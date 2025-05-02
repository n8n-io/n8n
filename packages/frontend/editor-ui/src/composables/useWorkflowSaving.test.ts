import { useUIStore } from '@/stores/ui.store';
import { MODAL_CANCEL, MODAL_CONFIRM, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import { useWorkflowSaving } from './useWorkflowSaving';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

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
