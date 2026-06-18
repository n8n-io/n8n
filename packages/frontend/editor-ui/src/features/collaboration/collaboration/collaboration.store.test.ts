import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { useCollaborationStore } from './collaboration.store';

const mockFetchWorkflow = vi.fn();
const mockShowMessage = vi.fn();
const mockSetChecksum = vi.fn();
const mockSetVersionData = vi.fn();
const mockWorkflowDocumentStore = {
	workflowId: 'workflow-1',
	setChecksum: mockSetChecksum,
	setVersionData: mockSetVersionData,
};
const mockUiStore = reactive({ stateIsDirty: false });

const mockPushStore = {
	send: vi.fn(),
	addEventListener: vi.fn().mockReturnValue(vi.fn()),
	clearQueue: vi.fn(),
};

const mockWorkflowId = ref('workflow-1');
const mockIsWorkflowSaved = ref<Record<string, boolean>>({
	'workflow-1': true,
	'workflow-2': true,
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => mockPushStore,
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		get workflowId() {
			return mockWorkflowId.value;
		},
		get isWorkflowSaved() {
			return mockIsWorkflowSaved.value;
		},
	}),
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		fetchWorkflow: mockFetchWorkflow,
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockWorkflowDocumentStore,
	createWorkflowDocumentId: (id: string) => id,
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		currentUserId: 'user-1',
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => mockUiStore,
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockShowMessage,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		pushRef: 'push-1',
	}),
}));

vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: () => ({
		streaming: false,
	}),
}));

vi.mock('@/app/api/workflows', () => ({
	getWorkflowWriteLock: vi.fn().mockResolvedValue(null),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({}),
}));

vi.mock('@/app/composables/useBeforeUnload', () => ({
	useBeforeUnload: () => ({
		addBeforeUnloadEventBindings: vi.fn(),
		removeBeforeUnloadEventBindings: vi.fn(),
		addBeforeUnloadHandler: vi.fn(),
	}),
}));

const { mockIsCrdtCollaborationEnabled } = vi.hoisted(() => ({
	mockIsCrdtCollaborationEnabled: vi.fn(() => false),
}));

vi.mock('@/experiments/utils', () => ({
	isCrdtCollaborationEnabled: mockIsCrdtCollaborationEnabled,
}));

describe('useCollaborationStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockWorkflowId.value = 'workflow-1';
		mockIsWorkflowSaved.value = { 'workflow-1': true, 'workflow-2': true };
		mockUiStore.stateIsDirty = false;
		mockShowMessage.mockImplementation(() => ({ close: vi.fn() }));
		mockIsCrdtCollaborationEnabled.mockReturnValue(false);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('workflowId change handling', () => {
		test('should not send release message when collaboratingWorkflowId is null', () => {
			const store = useCollaborationStore();

			// Don't initialize - collaboratingWorkflowId remains null
			store.releaseWriteAccess();

			// Should not have sent the writeAccessReleaseRequested message
			const releaseCall = mockPushStore.send.mock.calls.find(
				(call) => (call[0] as { type: string }).type === 'writeAccessReleaseRequested',
			);
			expect(releaseCall).toBeUndefined();
		});

		test('should use stored collaboratingWorkflowId when notifying workflow closed', async () => {
			const store = useCollaborationStore();

			// Initialize collaboration on workflow-1
			await store.initialize('workflow-1');

			// Clear any calls from initialization
			mockPushStore.send.mockClear();

			// Change workflowId to workflow-2 (simulating navigation)
			mockWorkflowId.value = 'workflow-2';

			// Terminate - should use the stored collaboratingWorkflowId (workflow-1)
			store.terminate();

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'workflowClosed',
				workflowId: 'workflow-1',
			});
		});
	});

	describe('remote workflow updates', () => {
		test('should show one sticky warning toast when remote update is blocked by dirty state and close it when clean again', async () => {
			const close = vi.fn();
			mockShowMessage.mockReturnValue({ close });
			const store = useCollaborationStore();

			await store.initialize('workflow-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as (event: {
				type: string;
				data: { workflowId: string };
			}) => void;
			mockUiStore.stateIsDirty = true;

			handler({
				type: 'workflowUpdated',
				data: { workflowId: 'workflow-1' },
			});
			handler({
				type: 'workflowUpdated',
				data: { workflowId: 'workflow-1' },
			});

			expect(mockShowMessage).toHaveBeenCalledTimes(1);
			expect(mockShowMessage).toHaveBeenCalledWith({
				title: 'workflows.remoteUpdateBlocked.title',
				message: 'workflows.remoteUpdateBlocked.message',
				type: 'warning',
				duration: 0,
				onClose: expect.any(Function),
			});
			expect(mockFetchWorkflow).not.toHaveBeenCalled();

			mockUiStore.stateIsDirty = false;
			await nextTick();

			expect(close).toHaveBeenCalledTimes(1);
		});
	});

	describe('shouldBeReadOnly with CRDT collaboration', () => {
		// Drives a writeAccessAcquired push so a chosen client holds the lock.
		// Current tab is user-1 / push-1 (see mocks), so a non-matching clientId
		// makes this tab a non-writer.
		async function acquireLockBy(userId: string, clientId: string) {
			const store = useCollaborationStore();
			await store.initialize('workflow-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as (event: {
				type: string;
				data: Record<string, unknown>;
			}) => void;
			handler({
				type: 'writeAccessAcquired',
				data: { workflowId: 'workflow-1', userId, clientId },
			});
			return store;
		}

		test('is read-only when another tab of the same user holds the lock (CRDT off)', async () => {
			const store = await acquireLockBy('user-1', 'push-2');

			expect(store.shouldBeReadOnly).toBe(true);

			store.terminate();
		});

		test('is editable when the same user holds the lock in another tab and CRDT is on', async () => {
			mockIsCrdtCollaborationEnabled.mockReturnValue(true);
			const store = await acquireLockBy('user-1', 'push-2');

			expect(store.shouldBeReadOnly).toBe(false);

			store.terminate();
		});

		test('stays read-only for a different user even when CRDT is on', async () => {
			mockIsCrdtCollaborationEnabled.mockReturnValue(true);
			const store = await acquireLockBy('user-2', 'push-2');

			expect(store.shouldBeReadOnly).toBe(true);

			store.terminate();
		});
	});

	describe('workflowUpdated under CRDT collaboration', () => {
		// Emits a workflowUpdated push as if `userId` saved the workflow elsewhere.
		// Returns once the (fire-and-forget) async handler has settled.
		async function emitWorkflowUpdated(userId: string) {
			const store = useCollaborationStore();
			await store.initialize('workflow-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as (event: {
				type: string;
				data: Record<string, unknown>;
			}) => void;
			handler({ type: 'workflowUpdated', data: { workflowId: 'workflow-1', userId } });
			await new Promise((resolve) => setTimeout(resolve, 0));
			return store;
		}

		test('fast-forwards the baseline instead of warning when the same user saves elsewhere', async () => {
			mockIsCrdtCollaborationEnabled.mockReturnValue(true);
			// Even with local edits, a same-user save is not a conflict under CRDT.
			mockUiStore.stateIsDirty = true;
			mockFetchWorkflow.mockResolvedValue({ versionId: 'version-2', checksum: 'checksum-2' });

			const store = await emitWorkflowUpdated('user-1');

			expect(mockSetVersionData).toHaveBeenCalledWith({
				versionId: 'version-2',
				name: null,
				description: null,
			});
			expect(mockSetChecksum).toHaveBeenCalledWith('checksum-2');
			expect(mockShowMessage).not.toHaveBeenCalled();

			store.terminate();
		});

		test('fast-forwards even when this tab holds the write lock (same user, CRDT on)', async () => {
			// Regression: under CRDT a sibling tab can save without holding the lock,
			// so the lock-holding tab must still realign its baseline (not early-return).
			mockIsCrdtCollaborationEnabled.mockReturnValue(true);
			mockFetchWorkflow.mockResolvedValue({ versionId: 'version-3', checksum: 'checksum-3' });

			const store = useCollaborationStore();
			await store.initialize('workflow-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as (event: {
				type: string;
				data: Record<string, unknown>;
			}) => void;
			// This tab acquires the lock (clientId === rootStore.pushRef 'push-1').
			handler({
				type: 'writeAccessAcquired',
				data: { workflowId: 'workflow-1', userId: 'user-1', clientId: 'push-1' },
			});
			expect(store.isCurrentTabWriter).toBe(true);

			// A sibling tab of the same user saves.
			handler({ type: 'workflowUpdated', data: { workflowId: 'workflow-1', userId: 'user-1' } });
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockSetChecksum).toHaveBeenCalledWith('checksum-3');

			store.terminate();
		});

		test('shows the conflict warning for a different user even when CRDT is on', async () => {
			mockIsCrdtCollaborationEnabled.mockReturnValue(true);
			mockUiStore.stateIsDirty = true;

			const store = await emitWorkflowUpdated('user-2');

			expect(mockSetChecksum).not.toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledTimes(1);

			store.terminate();
		});

		test('does not fast-forward when CRDT is off, even for the same user', async () => {
			// CRDT off (default): the same-user save still takes the normal path.
			mockUiStore.stateIsDirty = true;

			const store = await emitWorkflowUpdated('user-1');

			expect(mockSetChecksum).not.toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledTimes(1);

			store.terminate();
		});
	});
});
