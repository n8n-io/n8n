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

// A second workflow's document store, to model the editor switching to another
// workflow (or artifact tab) while a request is in flight.
const otherDocumentStore = vi.hoisted(() => ({
	setActiveState: vi.fn(),
	setPublicationStatus: vi.fn(),
	setVersionData: vi.fn(),
	setChecksum: vi.fn(),
	checksum: 'other-checksum' as string | undefined,
	versionData: null,
	hydrated: false,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn((documentId: string) =>
		documentId === 'wf-2@latest' ? otherDocumentStore : mockDocumentStore,
	),
	createWorkflowDocumentId: vi.fn((workflowId: string) => `${workflowId}@latest`),
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
const OTHER_WORKFLOW_ID = 'wf-2';
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
		otherDocumentStore.hydrated = false;
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

		it('does NOT refresh the checksum when the editor closed or switched workflows while the request was in flight', async () => {
			mockDocumentStore.hydrated = true;
			mockDocumentStore.checksum = 'before-publish';
			mockPublishWorkflow.mockImplementationOnce(async () => {
				mockDocumentStore.hydrated = false;
				return makePublishedWorkflowResponse();
			});

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockPublishWorkflow).toHaveBeenCalledWith(
				WORKFLOW_ID,
				expect.objectContaining({ expectedChecksum: 'before-publish' }),
			);
			expect(mockSetVersionData).not.toHaveBeenCalled();
			expect(mockSetChecksum).not.toHaveBeenCalled();
		});

		it('resolves the document store by the published workflow id, not by the editor in the route', async () => {
			// wf-1 is the routed editor, wf-2 is an embedded (artifact) editor; publish wf-2
			mockDocumentStore.hydrated = true;
			mockDocumentStore.checksum = 'wf-1-checksum';
			otherDocumentStore.hydrated = true;
			otherDocumentStore.checksum = 'wf-2-checksum';
			mockPublishWorkflow.mockResolvedValueOnce(makePublishedWorkflowResponse());

			const { publishWorkflow } = useWorkflowActivate();
			const result = await publishWorkflow(OTHER_WORKFLOW_ID, VERSION_ID);

			expect(result).toEqual({ success: true });
			expect(mockPublishWorkflow).toHaveBeenCalledWith(
				OTHER_WORKFLOW_ID,
				expect.objectContaining({ expectedChecksum: 'wf-2-checksum' }),
			);
			expect(otherDocumentStore.setChecksum).toHaveBeenCalledWith('abc123');
			expect(otherDocumentStore.setVersionData).toHaveBeenCalledWith(
				expect.objectContaining({ versionId: 'v-2' }),
			);
			expect(mockSetActiveState).not.toHaveBeenCalled();
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
