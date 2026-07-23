import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client';
import { useCollaborationStore } from './collaboration.store';

const mockFetchWorkflow = vi.fn();
const mockShowMessage = vi.fn();
const mockGetWorkflowWriteLock = vi.fn();
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
	getWorkflowWriteLock: (...args: unknown[]) => mockGetWorkflowWriteLock(...args),
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

describe('useCollaborationStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockWorkflowId.value = 'workflow-1';
		mockIsWorkflowSaved.value = { 'workflow-1': true, 'workflow-2': true };
		mockUiStore.stateIsDirty = false;
		mockShowMessage.mockImplementation(() => ({ close: vi.fn() }));
		mockGetWorkflowWriteLock.mockResolvedValue(null);
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

	describe('write-lock state polling', () => {
		type PushHandler = (event: {
			type: string;
			data: { workflowId: string; clientId: string; userId: string };
		}) => void;

		const otherWriterLock = { clientId: 'other-client', userId: 'other-user' };

		const initializeAsReader = async () => {
			const store = useCollaborationStore();
			await store.initialize('workflow-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;
			handler({
				type: 'writeAccessAcquired',
				data: { workflowId: 'workflow-1', ...otherWriterLock },
			});
			return { store, handler };
		};

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('should stop polling after a poll fails and clear the stale lock', async () => {
			const { store } = await initializeAsReader();
			expect(store.isAnyoneWriting).toBe(true);

			mockGetWorkflowWriteLock.mockRejectedValue(new Error('network error'));
			mockGetWorkflowWriteLock.mockClear();

			await vi.advanceTimersByTimeAsync(20_000);

			expect(mockGetWorkflowWriteLock).toHaveBeenCalledTimes(1);
			expect(store.isAnyoneWriting).toBe(false);

			await vi.advanceTimersByTimeAsync(60_000);
			expect(mockGetWorkflowWriteLock).toHaveBeenCalledTimes(1);
		});

		test('should not re-arm polling from push events after a poll fails with 401', async () => {
			const { store, handler } = await initializeAsReader();
			expect(store.isAnyoneWriting).toBe(true);

			// Session expires: every write-lock fetch now fails with 401
			mockGetWorkflowWriteLock.mockRejectedValue(
				new ResponseError('Unauthorized', { httpStatusCode: 401 }),
			);
			mockGetWorkflowWriteLock.mockClear();

			await vi.advanceTimersByTimeAsync(20_000);
			expect(mockGetWorkflowWriteLock).toHaveBeenCalledTimes(1);

			// Push events keep arriving over the still-open websocket, but must
			// not restart polling against the expired session
			for (let i = 0; i < 5; i++) {
				handler({
					type: 'writeAccessAcquired',
					data: { workflowId: 'workflow-1', ...otherWriterLock },
				});
				await vi.advanceTimersByTimeAsync(20_000);
			}

			expect(mockGetWorkflowWriteLock).toHaveBeenCalledTimes(1);
		});

		test('should resume polling after re-initialization following a 401', async () => {
			const { store } = await initializeAsReader();

			mockGetWorkflowWriteLock.mockRejectedValue(
				new ResponseError('Unauthorized', { httpStatusCode: 401 }),
			);
			await vi.advanceTimersByTimeAsync(20_000);

			store.terminate();

			// Fresh session: initialize again and become a reader
			mockGetWorkflowWriteLock.mockResolvedValue(otherWriterLock);
			mockPushStore.addEventListener.mockClear();
			await store.initialize('workflow-1');

			mockGetWorkflowWriteLock.mockClear();
			await vi.advanceTimersByTimeAsync(20_000);
			expect(mockGetWorkflowWriteLock).toHaveBeenCalledTimes(1);
		});

		test('should not continue polling after terminate', async () => {
			await initializeAsReader();
			const store = useCollaborationStore();

			store.terminate();
			mockGetWorkflowWriteLock.mockClear();

			await vi.advanceTimersByTimeAsync(60_000);
			expect(mockGetWorkflowWriteLock).not.toHaveBeenCalled();
		});
	});
});
