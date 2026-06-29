import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { Router } from 'vue-router';
import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { workflowFailedToActivate } from './workflowFailedToActivate';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

const { mockToast, mockI18n } = vi.hoisted(() => ({
	mockToast: {
		showError: vi.fn(),
	},
	mockI18n: {
		baseText: vi.fn().mockReturnValue('Activation error'),
	},
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => mockToast,
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => mockI18n,
}));

vi.mock('@/app/composables/useActivationError', () => ({
	useActivationError: () => ({ errorMessage: { value: 'Node error details' } }),
}));

describe('workflowFailedToActivate', () => {
	const documentId = createWorkflowDocumentId('wf-123');
	let options: PushHandlerOptions;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	function makeEvent(
		overrides: Partial<WorkflowFailedToActivate['data']> = {},
	): WorkflowFailedToActivate {
		return {
			type: 'workflowFailedToActivate',
			data: {
				workflowId: 'wf-123',
				errorMessage: 'Trigger registration failed',
				...overrides,
			},
		};
	}

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		options = { router: mock<Router>(), documentId };
		workflowDocumentStore = useWorkflowDocumentStore(documentId);
		// Simulate a previously-published workflow with an active version
		workflowDocumentStore.setActiveState({
			activeVersionId: 'v1',
			activeVersion: mock(),
		});
	});

	it('sets publicationStatus to failed without nodeId failures', async () => {
		await workflowFailedToActivate(makeEvent(), options);

		expect(workflowDocumentStore.publicationStatus).toBe('failed');
		expect(workflowDocumentStore.publicationFailures).toEqual([]);
	});

	it('sets a single failure entry when nodeId is provided', async () => {
		await workflowFailedToActivate(
			makeEvent({ nodeId: 'node-x', errorMessage: 'Path conflict' }),
			options,
		);

		expect(workflowDocumentStore.publicationStatus).toBe('failed');
		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'node-x', nodeName: 'node-x', errorMessage: 'Path conflict' },
		]);
	});

	it('does NOT clear activeVersion (failed is recoverable)', async () => {
		await workflowFailedToActivate(makeEvent(), options);

		// The published version must stay set — no setWorkflowInactive / null setActiveState
		expect(workflowDocumentStore.activeVersionId).toBe('v1');
		expect(workflowDocumentStore.activeVersion).not.toBeNull();
	});

	it('shows the error toast', async () => {
		await workflowFailedToActivate(makeEvent(), options);

		expect(mockToast.showError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.any(String),
			expect.objectContaining({ description: undefined }),
		);
	});

	it('does not set publicationStatus when the event is for a different workflow', async () => {
		await workflowFailedToActivate(makeEvent({ workflowId: 'wf-other' }), options);

		expect(workflowDocumentStore.publicationStatus).toBe('idle');
		expect(mockToast.showError).not.toHaveBeenCalled();
	});
});
