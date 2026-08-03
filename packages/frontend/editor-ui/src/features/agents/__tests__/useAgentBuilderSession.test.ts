import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';

interface ThreadStub {
	id: string;
	title: string | null;
	firstMessage?: string | null;
	updatedAt: string;
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

vi.mock('../utils/relative-time', () => ({
	useRelativeTimestamp: () => () => 'recently',
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

	it('keeps a bound session local when route backing is disabled', () => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		session.setSessionInUrl('bound-session');

		expect(session.activeChatSessionId.value).toBe('bound-session');
		expect(session.effectiveSessionId.value).toBe('bound-session');
		expect(replace).not.toHaveBeenCalled();
	});

	it('keeps a picked session local when route backing is disabled', () => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		session.onSessionPick('picked-session');

		expect(session.activeChatSessionId.value).toBe('picked-session');
		expect(session.effectiveSessionId.value).toBe('picked-session');
		expect(replace).not.toHaveBeenCalled();
	});

	it('keeps a newly minted session local when route backing is disabled', () => {
		route.query = { continueSessionId: 'route-session', keep: 'value' };
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		session.onNewChat();

		expect(session.activeChatSessionId.value).toEqual(expect.any(String));
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
				updatedAt: '2026-08-03T12:00:00.000Z',
			},
		];
		const session = useAgentBuilderSession({ routeBacked: ref(false) });

		session.onSessionPick('thread-1');

		expect(session.currentSessionHasMessages.value).toBe(true);
		expect(session.currentSessionTitle.value).toBe('Session title');
		expect(session.sessionMenu.value).toEqual([
			{
				id: 'thread-1',
				title: '',
				label: 'Session title',
				when: 'recently',
			},
		]);
	});
});
