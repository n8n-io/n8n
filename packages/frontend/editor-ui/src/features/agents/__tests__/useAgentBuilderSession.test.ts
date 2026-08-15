import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';

import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';

interface ThreadStub {
	id: string;
	title: string | null;
	firstMessage?: string | null;
}

const { replace, route, sessionsStore } = vi.hoisted(() => ({
	replace: vi.fn(),
	route: {
		query: {} as Record<string, string | string[] | null | undefined>,
	},
	sessionsStore: {
		threads: [] as ThreadStub[],
	},
}));

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => sessionsStore,
}));

describe('useAgentBuilderSession', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.query = {};
		sessionsStore.threads = [];
	});

	it('reactively ignores the route session when route backing is disabled', () => {
		route.query = { continueSessionId: 'route-session' };
		const routeBacked = ref(false);
		const session = useAgentBuilderSession({ routeBacked });

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
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		if (action === 'bind') session.setSessionInUrl(id);
		if (action === 'pick') session.onSessionPick(id);
		if (action === 'new') session.onNewChat();

		expect(session.activeChatSessionId.value).toEqual(id ?? expect.any(String));
		expect(session.effectiveSessionId.value).toBe(session.activeChatSessionId.value);
		expect(replace).not.toHaveBeenCalled();
	});

	it('writes bound, picked, and new sessions to the route when route backing is enabled', () => {
		route.query = { keep: 'value' };
		const session = useAgentBuilderSession({ routeBacked: ref(true) });

		session.setSessionInUrl('bound-session');
		expect(replace).toHaveBeenLastCalledWith({
			query: { keep: 'value', continueSessionId: 'bound-session' },
		});

		session.onSessionPick('picked-session');
		expect(replace).toHaveBeenLastCalledWith({
			query: { keep: 'value', continueSessionId: 'picked-session' },
		});

		session.onNewChat();
		expect(replace).toHaveBeenLastCalledWith({
			query: {
				keep: 'value',
				continueSessionId: session.activeChatSessionId.value,
			},
		});
	});

	it('uses an explicit route-backed selection before the route query catches up', () => {
		route.query = { continueSessionId: 'old-session' };
		const session = useAgentBuilderSession({ routeBacked: ref(true) });

		expect(session.effectiveSessionId.value).toBe('old-session');

		session.onSessionPick('picked-session');
		expect(session.effectiveSessionId.value).toBe('picked-session');

		session.onNewChat();
		expect(session.effectiveSessionId.value).toBe(session.activeChatSessionId.value);
		expect(session.effectiveSessionId.value).not.toBe('old-session');
	});

	it('uses a directly assigned route-backed session before navigation catches up', async () => {
		route.query = { continueSessionId: 'old-session' };
		const session = useAgentBuilderSession({ routeBacked: ref(true) });

		session.activeChatSessionId.value = 'direct-session';
		await nextTick();

		expect(session.effectiveSessionId.value).toBe('direct-session');
	});

	it('lets a later route change replace a pending local selection', async () => {
		route.query = reactive({ continueSessionId: 'old-session' });
		const session = useAgentBuilderSession({ routeBacked: ref(true) });
		session.onSessionPick('pending-session');
		expect(session.effectiveSessionId.value).toBe('pending-session');

		route.query.continueSessionId = 'history-session';
		await nextTick();

		expect(session.effectiveSessionId.value).toBe('history-session');
		expect(session.activeChatSessionId.value).toBe('history-session');
	});

	it('distinguishes a locally minted session from route-provided sessions', async () => {
		route.query = reactive({ continueSessionId: 'route-session' });
		const session = useAgentBuilderSession({ routeBacked: ref(true) });

		expect(session.currentSessionIsEphemeral.value).toBe(false);

		session.onNewChat();
		const newSessionId = session.effectiveSessionId.value;
		expect(session.currentSessionIsEphemeral.value).toBe(true);

		route.query.continueSessionId = newSessionId;
		await nextTick();
		expect(session.currentSessionIsEphemeral.value).toBe(true);

		route.query.continueSessionId = 'history-session';
		await nextTick();
		expect(session.effectiveSessionId.value).toBe('history-session');
		expect(session.currentSessionIsEphemeral.value).toBe(false);
	});

	it('only clears the route session when route backing is enabled', () => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const routeBacked = ref(false);
		const session = useAgentBuilderSession({ routeBacked });

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
				title: 'Session title',
			},
		];
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		session.onSessionPick('thread-1');

		expect(session.currentSessionHasMessages.value).toBe(true);
		expect(session.currentSessionTitle.value).toBe('Session title');
	});
});
