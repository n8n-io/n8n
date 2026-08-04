import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { workflowActivated } from './workflowActivated';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

const {
	mockWorkflowsListStore,
	mockCanvasOperations,
	mockBannersStore,
	mockUIStore,
	mockSettingsStore,
} = vi.hoisted(() => ({
	mockWorkflowsListStore: {
		fetchWorkflow: vi.fn(),
	},
	mockCanvasOperations: {
		initializeWorkspace: vi.fn(),
	},
	mockBannersStore: {
		removeBannerFromStack: vi.fn(),
	},
	mockUIStore: {
		stateIsDirty: false,
	},
	mockSettingsStore: {
		isWorkflowPublicationServiceEnabled: true,
	},
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => mockWorkflowsListStore,
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => mockCanvasOperations,
}));

vi.mock('@/features/shared/banners/banners.store', () => ({
	useBannersStore: () => mockBannersStore,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => mockUIStore,
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => mockSettingsStore,
}));

describe('workflowActivated', () => {
	const documentId = createWorkflowDocumentId('wf-123');
	let options: PushHandlerOptions;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	function makeEvent(workflowId = 'wf-123', activeVersionId = 'v1'): WorkflowActivated {
		return {
			type: 'workflowActivated',
			data: { workflowId, activeVersionId },
		};
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockUIStore.stateIsDirty = false;
		mockSettingsStore.isWorkflowPublicationServiceEnabled = true;
		options = { router: mock<Router>(), documentId };
		workflowDocumentStore = useWorkflowDocumentStore(documentId);
	});

	it('sets publicationStatus to published when viewing the activated workflow (flag ON)', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowActivated(makeEvent('wf-123', 'v1'), options);

		expect(workflowDocumentStore.publicationStatus).toBe('published');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
	});

	it('does NOT set publicationStatus when flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowActivated(makeEvent('wf-123', 'v1'), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
	});

	it('removes the auto-deactivated banner when viewing the activated workflow', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowActivated(makeEvent('wf-123', 'v1'), options);

		expect(mockBannersStore.removeBannerFromStack).toHaveBeenCalledWith(
			'WORKFLOW_AUTO_DEACTIVATED',
		);
	});

	it('removes the banner even when flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowActivated(makeEvent('wf-123', 'v1'), options);

		expect(mockBannersStore.removeBannerFromStack).toHaveBeenCalledWith(
			'WORKFLOW_AUTO_DEACTIVATED',
		);
	});

	it('does not set publicationStatus when the event is for a different workflow', async () => {
		await workflowActivated(makeEvent('wf-other', 'v1'), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(mockBannersStore.removeBannerFromStack).not.toHaveBeenCalled();
	});

	// Regression: INS-859 — "Workflow was changed by someone else" on dragging a node.
	//
	// `activeVersionId` is part of the conflict checksum (WORKFLOW_CHECKSUM_FIELDS in
	// packages/workflow/src/workflow-checksum.ts), so publishing/activating a workflow
	// changes its server-side checksum. When an AI-assistant artifact is published (the
	// builder calls WorkflowService.activateWorkflow, which emits a `workflowActivated`
	// push), the editor that is currently open must refresh its stored `expectedChecksum`
	// — otherwise the next autosave sends the pre-publish checksum and the backend's
	// `_detectConflicts` (workflow.service.ts) rejects it with a false 409.
	//
	// The sibling `workflowSettingsUpdated` handler already does exactly this
	// (`setChecksum(checksum)` with a comment "so the next normal save doesn't 409").
	// `workflowActivated` only refreshes when the workspace is clean, so a user who has an
	// unsaved position change (dirty state) when the publication lands is left holding a
	// stale checksum. This test pins that gap.
	it('refreshes the editor checksum on activation even when there are unsaved changes', async () => {
		// Editor opened before publication: draft checksum captured, workflow not yet published.
		workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
		workflowDocumentStore.setChecksum('checksum-before-publish');

		// User dragged a node → workspace is dirty, autosave pending.
		mockUIStore.stateIsDirty = true;

		// Publication lands (e.g. AI builder publishes the artifact): server checksum now
		// reflects the new activeVersionId.
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({
			id: 'wf-123',
			activeVersionId: 'v1',
			checksum: 'checksum-after-publish',
		});

		await workflowActivated(makeEvent('wf-123', 'v1'), options);

		// The stored expectedChecksum must be the post-publish value; otherwise the next
		// autosave of the position change 409s with "Workflow was changed by someone else".
		expect(workflowDocumentStore.checksum).toBe('checksum-after-publish');
		// The in-progress edits must survive: reconcile the checksum, never re-hydrate.
		expect(mockCanvasOperations.initializeWorkspace).not.toHaveBeenCalled();
	});
});
