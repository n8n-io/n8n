import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkflowActivate } from './useWorkflowActivate';

// --- hoisted mocks ---
// vi.hoisted callbacks run before any imports, so only plain JS is usable there.

const mockSetActiveState = vi.hoisted(() => vi.fn());
const mockSetPublicationStatus = vi.hoisted(() => vi.fn());
const mockSetVersionData = vi.hoisted(() => vi.fn());
const mockSetChecksum = vi.hoisted(() => vi.fn());

// `hydrated` and `checksum` are set per-test to model a document that is
// open in an editor (routed or embedded) versus one that is not.
const mockDocumentStore = vi.hoisted(() => ({
	setActiveState: mockSetActiveState,
	setPublicationStatus: mockSetPublicationStatus,
	setVersionData: mockSetVersionData,
	setChecksum: mockSetChecksum,
	checksum: undefined as string | undefined,
	versionData: null,
	hydrated: false,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => mockDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('doc-id'),
}));

const mockPublishWorkflow = vi.hoisted(() => vi.fn());
const mockDeactivateWorkflow = vi.hoisted(() => vi.fn());
const mockSetWorkflowActive = vi.hoisted(() => vi.fn());
const mockSetWorkflowInactive = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue({
		publishWorkflow: mockPublishWorkflow,
		deactivateWorkflow: mockDeactivateWorkflow,
		setWorkflowActive: mockSetWorkflowActive,
		setWorkflowInactive: mockSetWorkflowInactive,
	}),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn().mockReturnValue({
		getWorkflowById: vi.fn().mockReturnValue({ activeVersion: null }),
		fetchWorkflow: vi.fn(),
	}),
}));

// useSettingsStore is called at publish time (not at composable init), so we
// control the return value per-test via the mockSettingsImpl variable below.
const mockSettingsImpl = vi.hoisted(() => ({ isWorkflowPublicationServiceEnabled: false }));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => mockSettingsImpl),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
	}),
}));

vi.mock('@/features/collaboration/collaboration/collaboration.store', () => ({
	useCollaborationStore: vi.fn().mockReturnValue({
		requestWriteAccess: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@n8n/composables/useStorage', () => ({
	useStorage: vi.fn().mockReturnValue({ value: undefined }),
}));

vi.mock('@/app/composables/useActivationError', () => ({
	useActivationError: vi.fn().mockReturnValue({ errorMessage: { value: '' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn().mockReturnValue('') }),
}));

// --- helpers ---

const WORKFLOW_ID = 'wf-1';
const VERSION_ID = 'v-1';

function makePublishedWorkflowResponse() {
	return {
		activeVersion: {
			versionId: 'av-1',
			authors: '',
			createdAt: '',
			updatedAt: '',
			workflowPublishHistory: [],
			name: null,
			description: null,
		},
		checksum: 'abc123',
		versionId: 'v-2',
	};
}

// --- tests ---

describe('useWorkflowActivate', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockSettingsImpl.isWorkflowPublicationServiceEnabled = false;
		mockDocumentStore.hydrated = false;
		mockDocumentStore.checksum = undefined;
	});

	describe('publishWorkflow()', () => {
		it('sets publicationStatus to "publishing" when the publication service flag is ON', async () => {
			mockSettingsImpl.isWorkflowPublicationServiceEnabled = true;
			mockPublishWorkflow.mockResolvedValueOnce(makePublishedWorkflowResponse());

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockSetPublicationStatus).toHaveBeenCalledWith({ status: 'publishing' });
		});

		it('does NOT set publicationStatus when the publication service flag is OFF', async () => {
			mockSettingsImpl.isWorkflowPublicationServiceEnabled = false;
			mockPublishWorkflow.mockResolvedValueOnce(makePublishedWorkflowResponse());

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockSetPublicationStatus).not.toHaveBeenCalled();
		});

		it('does NOT set publicationStatus when the publish request fails', async () => {
			mockSettingsImpl.isWorkflowPublicationServiceEnabled = true;
			mockPublishWorkflow.mockRejectedValueOnce(new Error('network error'));

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: false, errorHandled: true });
			expect(mockSetPublicationStatus).not.toHaveBeenCalled();
		});

		it('sends the document checksum and refreshes it when the document is open in an editor', async () => {
			mockDocumentStore.hydrated = true;
			mockDocumentStore.checksum = 'before-publish';
			mockPublishWorkflow.mockResolvedValueOnce(makePublishedWorkflowResponse());

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockPublishWorkflow).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.objectContaining({ versionId: VERSION_ID, expectedChecksum: 'before-publish' }),
			);
			expect(mockSetVersionData).toHaveBeenCalledWith(
				expect.objectContaining({ versionId: 'v-2' }),
			);
			expect(mockSetChecksum).toHaveBeenCalledWith('abc123');
		});

		it('does NOT send or refresh the checksum when the document is not open in an editor', async () => {
			mockDocumentStore.checksum = 'stale';
			mockPublishWorkflow.mockResolvedValueOnce(makePublishedWorkflowResponse());

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockPublishWorkflow).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.objectContaining({ expectedChecksum: undefined }),
			);
			expect(mockSetVersionData).not.toHaveBeenCalled();
			expect(mockSetChecksum).not.toHaveBeenCalled();
		});
	});

	describe('unpublishWorkflowFromHistory()', () => {
		it('sends the document checksum when the document is open in an editor', async () => {
			mockDocumentStore.hydrated = true;
			mockDocumentStore.checksum = 'after-publish';
			mockDeactivateWorkflow.mockResolvedValueOnce(undefined);

			const { unpublishWorkflowFromHistory } = useWorkflowActivate();
			const result = await unpublishWorkflowFromHistory(WORKFLOW_ID);

			expect(result).toBe(true);
			expect(mockDeactivateWorkflow).toHaveBeenCalledWith(WORKFLOW_ID, 'after-publish');
			expect(mockSetActiveState).toHaveBeenCalledWith({
				activeVersionId: null,
				activeVersion: null,
			});
		});

		it('does NOT send a checksum when the document is not open in an editor', async () => {
			mockDocumentStore.checksum = 'stale';
			mockDeactivateWorkflow.mockResolvedValueOnce(undefined);

			const { unpublishWorkflowFromHistory } = useWorkflowActivate();
			const result = await unpublishWorkflowFromHistory(WORKFLOW_ID);

			expect(result).toBe(true);
			expect(mockDeactivateWorkflow).toHaveBeenCalledWith(WORKFLOW_ID, undefined);
		});
	});
});
