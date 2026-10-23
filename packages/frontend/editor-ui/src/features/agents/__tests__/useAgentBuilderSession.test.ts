import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';

import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants/modals';

import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';

interface ThreadStub {
	id: string;
	projectId: string;
	agentId: string;
	canContinueInPreview: boolean;
	title: string | null;
	firstMessage?: string | null;
	updatedAt?: string;
}

const { confirm, replace, route, sessionsStore, showError, showMessage } = vi.hoisted(() => ({
	confirm: vi.fn(),
	replace: vi.fn(),
	route: {
		query: {} as Record<string, string | string[] | null | undefined>,
	},
	sessionsStore: {
		threads: [] as ThreadStub[],
		previewThreads: [] as ThreadStub[],
		deleteThread: vi.fn(),
	},
	showError: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => sessionsStore,
}));

function createSession(routeBacked = ref(false)) {
	const projectId = ref('project-1');
	const agentId = ref('agent-1');
	return {
		projectId,
		agentId,
		session: useAgentBuilderSession({ routeBacked, projectId, agentId }),
	};
}

describe('useAgentBuilderSession', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.query = {};
		sessionsStore.threads = [];
		sessionsStore.previewThreads = [];
		confirm.mockResolvedValue(MODAL_CONFIRM);
		sessionsStore.deleteThread.mockResolvedValue(undefined);
	});

	it('reactively ignores the route session when route backing is disabled', () => {
		route.query = { continueSessionId: 'route-session' };
		const routeBacked = ref(false);
		const { session } = createSession(routeBacked);

		expect(session.continueSessionId.value).toBe('route-session');
		expect(session.effectiveSessionId.value).toBeUndefined();

		routeBacked.value = true;

		expect(session.effectiveSessionId.value).toBe('route-session');
	});

	it.each([
		['bound', 'bind', 'bound-session'],
		['picked', 'pick', 'picked-session'],
		['newly minted', 'new', undefined],
	] as const)('keeps a %s session local when route backing is disabled', (_kind, action, id) => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const { session } = createSession();

		if (action === 'bind') session.setSessionInUrl(id);
		if (action === 'pick') session.onSessionPick(id);
		if (action === 'new') session.onNewChat();

		expect(session.activeChatSessionId.value).toEqual(id ?? expect.any(String));
		expect(session.effectiveSessionId.value).toBe(session.activeChatSessionId.value);
		expect(replace).not.toHaveBeenCalled();
	});

	it('writes bound, picked, and new sessions to the route when route backing is enabled', () => {
		route.query = { keep: 'value' };
		const { session } = createSession(ref(true));

		session.setSessionInUrl('bound-session');
		expect(replace).toHaveBeenLastCalledWith({
			query: { keep: 'value', continueSessionId: 'bound-session' },
		});

		session.onSessionPick('picked-session');
		expect(replace).toHaveBeenLastCalledWith({
			query: { keep: 'value', continueSessionId: 'picked-session' },
		});

		session.onNewChat();
		const newSessionId = session.activeChatSessionId.value!;
		session.onSessionPick(newSessionId);
		expect(session.currentSessionIsEphemeral.value).toBe(true);
		expect(replace).toHaveBeenLastCalledWith({
			query: {
				keep: 'value',
				continueSessionId: session.activeChatSessionId.value,
			},
		});
	});

	it('uses an explicit route-backed selection before the route query catches up', () => {
		route.query = { continueSessionId: 'old-session' };
		const { session } = createSession(ref(true));

		expect(session.effectiveSessionId.value).toBe('old-session');

		session.onSessionPick('picked-session');
		expect(session.effectiveSessionId.value).toBe('picked-session');

		session.onNewChat();
		expect(session.effectiveSessionId.value).toBe(session.activeChatSessionId.value);
		expect(session.effectiveSessionId.value).not.toBe('old-session');
	});

	it('uses a directly assigned route-backed session before navigation catches up', async () => {
		route.query = { continueSessionId: 'old-session' };
		const { session } = createSession(ref(true));

		session.activeChatSessionId.value = 'direct-session';
		await nextTick();

		expect(session.effectiveSessionId.value).toBe('direct-session');
	});

	it('lets a later route change replace a pending local selection', async () => {
		route.query = reactive({ continueSessionId: 'old-session' });
		const { session } = createSession(ref(true));
		session.onSessionPick('pending-session');
		expect(session.effectiveSessionId.value).toBe('pending-session');

		route.query.continueSessionId = 'history-session';
		await nextTick();

		expect(session.effectiveSessionId.value).toBe('history-session');
		expect(session.activeChatSessionId.value).toBe('history-session');
	});

	it('distinguishes a locally minted session from route-provided sessions', async () => {
		route.query = reactive({ continueSessionId: 'route-session' });
		const { session } = createSession(ref(true));

		expect(session.currentSessionIsEphemeral.value).toBe(false);

		session.onNewChat();
		const newSessionId = session.effectiveSessionId.value;
		expect(session.currentSessionIsEphemeral.value).toBe(true);

		route.query.continueSessionId = newSessionId;
		await nextTick();
		expect(session.currentSessionIsEphemeral.value).toBe(true);
		expect(session.currentSessionIsLocallyMinted.value).toBe(true);
		if (!newSessionId) throw new Error('Expected a new session ID');
		session.markSessionCreated(newSessionId);
		expect(session.currentSessionIsEphemeral.value).toBe(false);
		expect(session.currentSessionIsLocallyMinted.value).toBe(true);

		route.query.continueSessionId = 'history-session';
		await nextTick();
		expect(session.effectiveSessionId.value).toBe('history-session');
		expect(session.currentSessionIsEphemeral.value).toBe(false);
		expect(session.currentSessionIsLocallyMinted.value).toBe(false);
	});

	it('only clears the route session when route backing is enabled', () => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const routeBacked = ref(false);
		const { session } = createSession(routeBacked);

		session.clearContinueSessionParam();
		expect(replace).not.toHaveBeenCalled();

		routeBacked.value = true;
		session.clearContinueSessionParam();
		expect(replace).toHaveBeenCalledWith({ query: { keep: 'value' } });
	});

	it('derives session metadata from a locally selected thread', () => {
		sessionsStore.threads = [
			{
				id: 'thread-1',
				projectId: 'project-1',
				agentId: 'agent-1',
				canContinueInPreview: true,
				title: 'Session title',
			},
		];
		const { session } = createSession();

		session.onSessionPick('thread-1');

		expect(session.currentSessionHasMessages.value).toBe(true);
		expect(session.currentSessionTitle.value).toBe('Session title');
	});

	it('exposes each session title and update time to the history menu', () => {
		sessionsStore.previewThreads = [
			{
				id: 'thread-1',
				projectId: 'project-1',
				agentId: 'agent-1',
				canContinueInPreview: true,
				title: 'Session title',
				updatedAt: '2026-09-17T10:00:00.000Z',
			},
		];
		const { session } = createSession();

		expect(session.sessionMenu.value[0]).toMatchObject({
			title: 'Session title',
			updatedAt: '2026-09-17T10:00:00.000Z',
		});
	});

	it('uses only Preview sessions for the selector and current title', () => {
		const base = { projectId: 'project-1', agentId: 'agent-1', title: 'Session' };
		sessionsStore.threads = [
			{ ...base, id: 'shared', canContinueInPreview: false },
			{ ...base, id: 'child', canContinueInPreview: false },
		];
		sessionsStore.previewThreads = [{ ...base, id: 'private', canContinueInPreview: true }];
		const { session } = createSession();
		session.onSessionPick('private');
		expect(session.sessionMenu.value.map(({ id }) => id)).toEqual(['private']);
		expect(session.currentSessionHasMessages.value).toBe(true);
		expect(session.currentSessionTitle.value).toBe('Session');
	});

	it('deletes the active session and starts a new one', async () => {
		const { session } = createSession();
		session.onSessionPick('thread-1');

		await expect(session.deleteSession('thread-1')).resolves.toBe(true);

		expect(confirm).toHaveBeenCalledExactlyOnceWith(
			'agentSessions.deleteConfirm.message',
			'agentSessions.deleteConfirm.headline',
			{
				type: 'warning',
				confirmButtonText: 'agentSessions.deleteConfirm.confirmButtonText',
				cancelButtonText: '',
			},
		);
		expect(sessionsStore.deleteThread).toHaveBeenCalledExactlyOnceWith(
			'project-1',
			'agent-1',
			'thread-1',
		);
		expect(showMessage).toHaveBeenCalledExactlyOnceWith({
			title: 'agentSessions.showMessage.deleted',
			type: 'success',
		});
		expect(session.effectiveSessionId.value).toEqual(expect.any(String));
		expect(session.effectiveSessionId.value).not.toBe('thread-1');
		expect(session.isDeletingSession.value).toBe(false);
	});

	it('deletes a non-active session without changing the preview', async () => {
		const { session } = createSession();
		session.onSessionPick('thread-1');

		await expect(session.deleteSession('thread-2')).resolves.toBe(true);

		expect(session.effectiveSessionId.value).toBe('thread-1');
	});

	it('keeps the session when deletion is cancelled', async () => {
		confirm.mockResolvedValueOnce(MODAL_CANCEL);
		const { session } = createSession();
		session.onSessionPick('thread-1');

		await expect(session.deleteSession('thread-1')).resolves.toBe(false);

		expect(sessionsStore.deleteThread).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
		expect(session.effectiveSessionId.value).toBe('thread-1');
	});

	it('reports a deletion failure and keeps the session', async () => {
		const error = new Error('Delete failed');
		sessionsStore.deleteThread.mockRejectedValueOnce(error);
		const { session } = createSession();
		session.onSessionPick('thread-1');

		await expect(session.deleteSession('thread-1')).resolves.toBe(false);

		expect(showError).toHaveBeenCalledExactlyOnceWith(error, 'agentSessions.showError.delete');
		expect(showMessage).not.toHaveBeenCalled();
		expect(session.effectiveSessionId.value).toBe('thread-1');
	});

	it('blocks repeated deletion while the first request is pending', async () => {
		const confirmation = Promise.withResolvers<string>();
		confirm.mockReturnValueOnce(confirmation.promise);
		const { session } = createSession();

		const firstDeletion = session.deleteSession('thread-1');
		await expect(session.deleteSession('thread-2')).resolves.toBe(false);

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(session.isDeletingSession.value).toBe(true);

		confirmation.resolve(MODAL_CANCEL);
		await expect(firstDeletion).resolves.toBe(false);
		expect(session.isDeletingSession.value).toBe(false);
	});

	it('does not replace a session selected while deletion is pending', async () => {
		const deletion = Promise.withResolvers<void>();
		sessionsStore.deleteThread.mockReturnValueOnce(deletion.promise);
		const { session } = createSession();
		session.onSessionPick('thread-1');

		const deletionResult = session.deleteSession('thread-1');
		await vi.waitFor(() => {
			expect(sessionsStore.deleteThread).toHaveBeenCalledTimes(1);
		});
		session.onSessionPick('thread-2');
		deletion.resolve();

		await expect(deletionResult).resolves.toBe(true);
		expect(session.effectiveSessionId.value).toBe('thread-2');
	});

	it('ignores delete completion after switching agents', async () => {
		const deletion = Promise.withResolvers<void>();
		sessionsStore.deleteThread.mockReturnValueOnce(deletion.promise);
		const { agentId, session } = createSession();
		session.onSessionPick('thread-1');

		const deletionResult = session.deleteSession('thread-1');
		await vi.waitFor(() => {
			expect(sessionsStore.deleteThread).toHaveBeenCalledExactlyOnceWith(
				'project-1',
				'agent-1',
				'thread-1',
			);
		});
		agentId.value = 'agent-2';
		deletion.resolve();

		await expect(deletionResult).resolves.toBe(false);
		expect(showMessage).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
	});

	it('ignores delete completion after its owner is disposed', async () => {
		const deletion = Promise.withResolvers<void>();
		sessionsStore.deleteThread.mockReturnValueOnce(deletion.promise);
		const scope = effectScope();
		const scopedSession = scope.run(() => createSession());
		if (!scopedSession) throw new Error('Expected effect scope to run');
		const { session } = scopedSession;
		session.onSessionPick('thread-1');

		const deletionResult = session.deleteSession('thread-1');
		await vi.waitFor(() => {
			expect(sessionsStore.deleteThread).toHaveBeenCalledTimes(1);
		});
		scope.stop();
		deletion.resolve();

		await expect(deletionResult).resolves.toBe(false);
		expect(showMessage).not.toHaveBeenCalled();
		expect(showError).not.toHaveBeenCalled();
		expect(session.effectiveSessionId.value).toBe('thread-1');
	});
});
