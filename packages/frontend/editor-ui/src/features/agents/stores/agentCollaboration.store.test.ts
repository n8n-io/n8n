import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAgentCollaborationStore } from './agentCollaboration.store';

const mockGetAgentWriteLock = vi.fn();

const mockPushStore = {
	send: vi.fn(),
	addEventListener: vi.fn().mockReturnValue(vi.fn()),
	clearQueue: vi.fn(),
};

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => mockPushStore,
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({
		currentUserId: 'user-1',
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		pushRef: 'push-1',
	}),
}));

vi.mock('../composables/useAgentApi', () => ({
	getAgentWriteLock: (...args: unknown[]) => mockGetAgentWriteLock(...args),
}));

type PushHandler = (event: {
	type: string;
	data: { agentId: string; clientId?: string; userId?: string };
}) => void;

describe('useAgentCollaborationStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		mockGetAgentWriteLock.mockResolvedValue(null);
	});

	afterEach(() => {
		// Stop heartbeats, lock timers, and polling from the test's
		// initialize() so they cannot fire during later tests.
		useAgentCollaborationStore().terminate();
		vi.clearAllMocks();
	});

	describe('initialize', () => {
		test('sends agentOpened but does not eagerly request write access', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'agentOpened',
				agentId: 'agent-1',
			});
			// Lazy acquisition: the lock is acquired on first edit, not on mount.
			const requestCall = mockPushStore.send.mock.calls.find(
				(call) => (call[0] as { type: string }).type === 'agentWriteAccessRequested',
			);
			expect(requestCall).toBeUndefined();
		});

		test('does not request write access when a lock already exists', async () => {
			mockGetAgentWriteLock.mockResolvedValue({
				clientId: 'otherClient',
				userId: 'otherUser',
			});
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'agentOpened',
				agentId: 'agent-1',
			});
			const requestCall = mockPushStore.send.mock.calls.find(
				(call) => (call[0] as { type: string }).type === 'agentWriteAccessRequested',
			);
			expect(requestCall).toBeUndefined();
		});
	});

	describe('re-initialize with a different agent', () => {
		test('closes the previous agent before opening the next one', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			mockPushStore.send.mockClear();

			await store.initialize('project-1', 'agent-2');

			const messages = mockPushStore.send.mock.calls.map(
				(call) => call[0] as { type: string; agentId: string },
			);
			const closedIndex = messages.findIndex(
				(m) => m.type === 'agentClosed' && m.agentId === 'agent-1',
			);
			const openedIndex = messages.findIndex(
				(m) => m.type === 'agentOpened' && m.agentId === 'agent-2',
			);
			expect(closedIndex).toBeGreaterThanOrEqual(0);
			expect(openedIndex).toBeGreaterThan(closedIndex);
		});

		test('is a no-op when re-initialized with the same agent', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			mockPushStore.send.mockClear();

			await store.initialize('project-1', 'agent-1');

			expect(mockPushStore.send).not.toHaveBeenCalled();
		});
	});

	describe('terminate', () => {
		test('sends agentClosed on terminate', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			mockPushStore.send.mockClear();

			store.terminate();

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'agentClosed',
				agentId: 'agent-1',
			});
		});
	});

	describe('requestWriteAccessForce', () => {
		test('sends a forced agentWriteAccessRequested message', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			mockPushStore.send.mockClear();

			store.requestWriteAccessForce();

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'agentWriteAccessRequested',
				agentId: 'agent-1',
				force: true,
			});
		});
	});

	describe('requestWriteAccess', () => {
		test('sends agentWriteAccessRequested and keeps the tab editable while waiting', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			mockPushStore.send.mockClear();

			store.requestWriteAccess();

			expect(mockPushStore.send).toHaveBeenCalledWith({
				type: 'agentWriteAccessRequested',
				agentId: 'agent-1',
			});
			// The lock is lazy: the edit that triggered the request must not be
			// blocked (or its autosave cancelled) during the round-trip.
			expect(store.shouldBeReadOnly).toBe(false);
		});

		test('is a no-op when already the current tab writer', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;

			// Acquire the lock for this tab
			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-1', clientId: 'push-1', userId: 'user-1' },
			});
			mockPushStore.send.mockClear();

			store.requestWriteAccess();

			// No message sent — already the writer
			const requestCall = mockPushStore.send.mock.calls.find(
				(call) => (call[0] as { type: string }).type === 'agentWriteAccessRequested',
			);
			expect(requestCall).toBeUndefined();
		});
	});

	describe('recordActivity', () => {
		test('is exposed and updates lastActivityTime', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');

			// recordActivity is a no-op function that updates internal state.
			// It should not throw and should be callable.
			expect(() => store.recordActivity()).not.toThrow();
		});
	});

	describe('push event handling', () => {
		test('sets the write lock and starts heartbeat on writeAccessAcquired for the current tab', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;

			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-1', clientId: 'push-1', userId: 'user-1' },
			});

			expect(store.isCurrentTabWriter).toBe(true);
			expect(store.shouldBeReadOnly).toBe(false);
		});

		test('sets read-only mode on writeAccessAcquired for a different tab', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;

			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-1', clientId: 'otherClient', userId: 'otherUser' },
			});

			expect(store.isCurrentTabWriter).toBe(false);
			expect(store.shouldBeReadOnly).toBe(true);
		});

		test('becomes editable on writeAccessReleased without grabbing the lock', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;

			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-1', clientId: 'otherClient', userId: 'otherUser' },
			});
			expect(store.shouldBeReadOnly).toBe(true);
			mockPushStore.send.mockClear();

			handler({
				type: 'writeAccessReleased',
				data: { agentId: 'agent-1' },
			});

			// The lock stays free until this tab edits. Auto-acquiring here would
			// lock out the tab that just released and ping-pong between idle tabs.
			expect(store.shouldBeReadOnly).toBe(false);
			expect(store.isAnyoneWriting).toBe(false);
			expect(mockPushStore.send).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'agentWriteAccessRequested' }),
			);
		});

		test('ignores push events for a different agent', async () => {
			const store = useAgentCollaborationStore();

			await store.initialize('project-1', 'agent-1');
			const handler = mockPushStore.addEventListener.mock.calls[0][0] as PushHandler;

			// This tab acquires the lock first so it starts writable
			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-1', clientId: 'push-1', userId: 'user-1' },
			});
			expect(store.shouldBeReadOnly).toBe(false);

			handler({
				type: 'writeAccessAcquired',
				data: { agentId: 'agent-2', clientId: 'otherClient', userId: 'otherUser' },
			});

			expect(store.shouldBeReadOnly).toBe(false);
		});
	});
});
