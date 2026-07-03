import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { workflowDeactivated } from './workflowDeactivated';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

const { mockSettingsStore, mockUiStore, mockInitializeWorkspace, mockFetchWorkflow } = vi.hoisted(
	() => ({
		mockSettingsStore: { isWorkflowPublicationServiceEnabled: true },
		mockUiStore: { stateIsDirty: true },
		mockInitializeWorkspace: vi.fn(),
		mockFetchWorkflow: vi.fn().mockResolvedValue({ checksum: 'abc' }),
	}),
);

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => mockSettingsStore,
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

describe('workflowDeactivated', () => {
	const documentId = createWorkflowDocumentId('wf-123');
	let options: PushHandlerOptions;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	function makeEvent(workflowId = 'wf-123'): WorkflowDeactivated {
		return { type: 'workflowDeactivated', data: { workflowId } };
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockSettingsStore.isWorkflowPublicationServiceEnabled = true;
		mockUiStore.stateIsDirty = true;
		options = { router: mock<Router>(), documentId };
		workflowDocumentStore = useWorkflowDocumentStore(documentId);
		// Simulate a workflow that was published partially before being unpublished.
		workflowDocumentStore.setPublicationStatus({
			status: 'partial',
			failures: [{ nodeId: 'n1', nodeName: 'A', errorMessage: 'boom' }],
		});
	});

	it('clears a stale publication status when the workflow is deactivated', async () => {
		await workflowDeactivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
	});

	it('clears the status on the non-dirty (re-init) path too', async () => {
		mockUiStore.stateIsDirty = false;

		await workflowDeactivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(mockFetchWorkflow).toHaveBeenCalledWith('wf-123');
	});

	it('does not touch status for a different workflow', async () => {
		await workflowDeactivated(makeEvent('wf-other'), options);

		expect(workflowDocumentStore.publicationStatus).toBe('partial');
	});

	it('does not clear when the publication service flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;

		await workflowDeactivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('partial');
	});
});
