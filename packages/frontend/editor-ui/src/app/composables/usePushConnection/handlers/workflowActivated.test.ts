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
});
