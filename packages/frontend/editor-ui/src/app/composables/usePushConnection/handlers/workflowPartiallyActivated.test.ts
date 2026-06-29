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
		options = { router: mock<Router>(), documentId };
		workflowDocumentStore = useWorkflowDocumentStore(documentId);
	});

	it('sets publicationStatus to partial with mapped failures', async () => {
		mockWorkflowsListStore.fetchWorkflow.mockResolvedValue({ id: 'wf-123', checksum: 'abc' });

		await workflowPartiallyActivated(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('partial');
		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'node-1', nodeName: 'Webhook', errorMessage: 'Path conflict' },
			{ nodeId: 'node-2', nodeName: 'Schedule', errorMessage: 'Registration failed' },
		]);
	});

	it('shows the error toast', async () => {
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

	it('does not set publicationStatus when the event is for a different workflow', async () => {
		await workflowPartiallyActivated(makeEvent({ workflowId: 'wf-other' }), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
		expect(mockToast.showError).not.toHaveBeenCalled();
	});
});
