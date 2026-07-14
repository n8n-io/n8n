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
import type { INodeUi } from '@/Interface';

const { mockToast, mockI18n, mockSettingsStore, mockWorkflowsStore } = vi.hoisted(() => ({
	mockToast: {
		showError: vi.fn(),
	},
	mockI18n: {
		baseText: vi.fn().mockReturnValue('Activation error'),
	},
	mockSettingsStore: {
		isWorkflowPublicationServiceEnabled: true,
	},
	mockWorkflowsStore: {
		setWorkflowInactive: vi.fn(),
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

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => mockSettingsStore,
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => mockWorkflowsStore,
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

	describe('flag ON (publication service enabled)', () => {
		beforeEach(() => {
			mockSettingsStore.isWorkflowPublicationServiceEnabled = true;
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

		it('resolves nodeName from getNodeById when available', async () => {
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue({
				name: 'My Webhook',
			} as INodeUi);

			await workflowFailedToActivate(
				makeEvent({ nodeId: 'node-x', errorMessage: 'Path conflict' }),
				options,
			);

			expect(workflowDocumentStore.getNodeById).toHaveBeenCalledWith('node-x');
			expect(workflowDocumentStore.publicationFailures).toEqual([
				{ nodeId: 'node-x', nodeName: 'My Webhook', errorMessage: 'Path conflict' },
			]);
		});

		it('falls back to nodeId as nodeName when getNodeById returns undefined', async () => {
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(undefined);

			await workflowFailedToActivate(
				makeEvent({ nodeId: 'unknown-node', errorMessage: 'err' }),
				options,
			);

			expect(workflowDocumentStore.publicationFailures).toEqual([
				{ nodeId: 'unknown-node', nodeName: 'unknown-node', errorMessage: 'err' },
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

	describe('flag OFF (legacy path)', () => {
		beforeEach(() => {
			mockSettingsStore.isWorkflowPublicationServiceEnabled = false;
		});

		it('clears active state (legacy behavior)', async () => {
			await workflowFailedToActivate(makeEvent(), options);

			expect(workflowDocumentStore.activeVersionId).toBeNull();
			expect(workflowDocumentStore.activeVersion).toBeNull();
		});

		it('calls setWorkflowInactive on the workflows store', async () => {
			await workflowFailedToActivate(makeEvent(), options);

			expect(mockWorkflowsStore.setWorkflowInactive).toHaveBeenCalledWith('wf-123');
		});

		it('leaves publicationStatus as idle', async () => {
			await workflowFailedToActivate(makeEvent(), options);

			expect(workflowDocumentStore.publicationStatus).toBe('idle');
		});

		it('still shows the error toast', async () => {
			await workflowFailedToActivate(makeEvent(), options);

			expect(mockToast.showError).toHaveBeenCalledWith(
				expect.any(Error),
				expect.any(String),
				expect.objectContaining({ description: undefined }),
			);
		});

		it('does not call setWorkflowInactive when the event is for a different workflow', async () => {
			await workflowFailedToActivate(makeEvent({ workflowId: 'wf-other' }), options);

			expect(mockWorkflowsStore.setWorkflowInactive).not.toHaveBeenCalled();
			expect(mockToast.showError).not.toHaveBeenCalled();
		});
	});
});
