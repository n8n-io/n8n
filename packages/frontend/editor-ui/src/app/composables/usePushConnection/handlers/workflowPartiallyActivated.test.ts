import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { WorkflowPartiallyActivated } from '@n8n/api-types/push/workflow';
import { workflowPartiallyActivated } from './workflowPartiallyActivated';
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
	mockToast,
	mockI18n,
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
	mockToast: {
		showError: vi.fn(),
	},
	mockI18n: {
		baseText: vi.fn().mockReturnValue('Partial activation error'),
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

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => mockI18n,
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => mockSettingsStore,
}));

describe('workflowPartiallyActivated', () => {
	const documentId = createWorkflowDocumentId('wf-123');
	let options: PushHandlerOptions;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	function makeEvent(
		overrides: Partial<WorkflowPartiallyActivated['data']> = {},
	): WorkflowPartiallyActivated {
		return {
			type: 'workflowPartiallyActivated',
			data: {
				workflowId: 'wf-123',
				activeVersionId: 'v2',
				errorMessage: 'Some triggers failed',
				failedNodes: [
					{ nodeId: 'node-1', nodeName: 'Webhook', errorMessage: 'Path conflict' },
					{ nodeId: 'node-2', nodeName: 'Schedule', errorMessage: 'Registration failed' },
				],
				...overrides,
			},
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

	it('sets publicationStatus to partial with mapped failures (flag ON)', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('partial');
		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'node-1', nodeName: 'Webhook', errorMessage: 'Path conflict' },
			{ nodeId: 'node-2', nodeName: 'Schedule', errorMessage: 'Registration failed' },
		]);
	});

	it('does NOT set publicationStatus when flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
	});

	it('shows the error toast', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('shows the error toast even when flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(mockToast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('removes the auto-deactivated banner', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(mockBannersStore.removeBannerFromStack).toHaveBeenCalledWith(
			'WORKFLOW_AUTO_DEACTIVATED',
		);
	});

	it('removes the banner even when flag is off', async () => {
		mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(mockBannersStore.removeBannerFromStack).toHaveBeenCalledWith(
			'WORKFLOW_AUTO_DEACTIVATED',
		);
	});

	it('does not set publicationStatus when the event is for a different workflow', async () => {
		await workflowPartiallyActivated(makeEvent({ workflowId: 'wf-other' }), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
		expect(mockToast.showError).not.toHaveBeenCalled();
	});

	// Regression: INS-859 — same latent defect as workflowActivated. `activeVersionId` is part
	// of the conflict checksum (WORKFLOW_CHECKSUM_FIELDS in packages/workflow), so a partial
	// activation also changes the server-side checksum. An editor with unsaved changes must
	// refresh its stored `expectedChecksum` instead of being left holding the pre-publish value,
	// which would 409 the next autosave with "Workflow was changed by someone else".
	it('refreshes the editor checksum on partial activation even when there are unsaved changes', async () => {
		// Editor opened before publication: draft checksum captured, workflow not yet published.
		workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
		workflowDocumentStore.setChecksum('checksum-before-publish');

		// User dragged a node → workspace is dirty, autosave pending.
		mockUIStore.stateIsDirty = true;

		// Publication lands with a partial result: server checksum now reflects the new
		// activeVersionId.
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({
			id: 'wf-123',
			activeVersionId: 'v2',
			checksum: 'checksum-after-publish',
		});

		await workflowPartiallyActivated(makeEvent(), options);

		expect(workflowDocumentStore.checksum).toBe('checksum-after-publish');
		// The in-progress edits must survive: reconcile the checksum, never re-hydrate.
		expect(mockCanvasOperations.initializeWorkspace).not.toHaveBeenCalled();
	});
});
