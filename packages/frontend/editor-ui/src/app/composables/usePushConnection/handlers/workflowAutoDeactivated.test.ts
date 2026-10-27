import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { WorkflowAutoDeactivated } from '@n8n/api-types/push/workflow';
import { workflowAutoDeactivated } from './workflowAutoDeactivated';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

const {
	mockUiStore,
	mockInitializeWorkspace,
	mockFetchWorkflow,
	mockSetWorkflowInactive,
	mockPushBannerToStack,
} = vi.hoisted(() => ({
	mockUiStore: { stateIsDirty: true },
	mockInitializeWorkspace: vi.fn(),
	mockFetchWorkflow: vi.fn().mockResolvedValue({ checksum: 'abc' }),
	mockSetWorkflowInactive: vi.fn(),
	mockPushBannerToStack: vi.fn(),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => mockUiStore,
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({ initializeWorkspace: mockInitializeWorkspace }),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ fetchWorkflow: mockFetchWorkflow }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ setWorkflowInactive: mockSetWorkflowInactive }),
}));

vi.mock('@/features/shared/banners/banners.store', () => ({
	useBannersStore: () => ({ pushBannerToStack: mockPushBannerToStack }),
}));

describe('workflowAutoDeactivated', () => {
	const documentId = createWorkflowDocumentId('wf-123');
	let options: PushHandlerOptions;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	function makeEvent(workflowId = 'wf-123'): WorkflowAutoDeactivated {
		return { type: 'workflowAutoDeactivated', data: { workflowId } };
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockUiStore.stateIsDirty = true;
		mockFetchWorkflow.mockResolvedValue({ checksum: 'abc' });
		options = { router: mock<Router>(), documentId };
		workflowDocumentStore = useWorkflowDocumentStore(documentId);
	});

	it('marks the workflow inactive in the workflows store', async () => {
		await workflowAutoDeactivated(makeEvent(), options);

		expect(mockSetWorkflowInactive).toHaveBeenCalledWith('wf-123');
	});

	it('pushes the auto-deactivated banner when viewing the workflow', async () => {
		await workflowAutoDeactivated(makeEvent(), options);

		expect(mockPushBannerToStack).toHaveBeenCalledWith('WORKFLOW_AUTO_DEACTIVATED');
	});

	it('does not fetch or push the banner for a different workflow', async () => {
		await workflowAutoDeactivated(makeEvent('wf-other'), options);

		expect(mockSetWorkflowInactive).toHaveBeenCalledWith('wf-other');
		expect(mockFetchWorkflow).not.toHaveBeenCalled();
		expect(mockPushBannerToStack).not.toHaveBeenCalled();
	});

	it('re-hydrates the workspace when there are no unsaved changes', async () => {
		mockUiStore.stateIsDirty = false;
		const updatedWorkflow = { id: 'wf-123', activeVersionId: null, checksum: 'fresh' };
		mockFetchWorkflow.mockResolvedValue(updatedWorkflow);

		await workflowAutoDeactivated(makeEvent(), options);

		expect(mockInitializeWorkspace).toHaveBeenCalledWith(updatedWorkflow);
	});

	// Regression: INS-859 (deactivation sibling of the activation fix in #34095). An
	// auto-deactivation (e.g. a trigger failing to re-register) also clears activeVersionId
	// server-side, which is part of the conflict checksum (WORKFLOW_CHECKSUM_FIELDS in
	// packages/workflow/src/workflow-checksum.ts). If it lands while the editor has unsaved
	// edits, the stored `expectedChecksum` must be refreshed — otherwise the next autosave
	// sends the pre-deactivation checksum and the backend rejects it with a false 409
	// ("Workflow was changed by someone else"). The dirty branch used to null the active state
	// without refreshing the checksum; this pins that gap.
	it('refreshes the editor checksum on auto-deactivation even when there are unsaved changes', async () => {
		// Editor holds the pre-deactivation checksum.
		workflowDocumentStore.setChecksum('checksum-before-deactivate');

		// User dragged a node → workspace is dirty, autosave pending.
		mockUiStore.stateIsDirty = true;

		// Auto-deactivation lands: server checksum now reflects the cleared activeVersionId.
		mockFetchWorkflow.mockResolvedValue({
			id: 'wf-123',
			activeVersionId: null,
			checksum: 'checksum-after-deactivate',
		});

		await workflowAutoDeactivated(makeEvent(), options);

		// The stored expectedChecksum must be the post-deactivation value; otherwise the next
		// autosave 409s with "Workflow was changed by someone else".
		expect(workflowDocumentStore.checksum).toBe('checksum-after-deactivate');
		// The in-progress edits must survive: reconcile the checksum, never re-hydrate.
		expect(mockInitializeWorkspace).not.toHaveBeenCalled();
		// The banner still fires after reconciling the checksum.
		expect(mockPushBannerToStack).toHaveBeenCalledWith('WORKFLOW_AUTO_DEACTIVATED');
	});
});
