import type { LoginSession, LoginSessionList } from '@n8n/api-types';
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import * as loginSessionsApi from '@n8n/rest-api-client/api/login-sessions';

import { useLoginSessionsStore } from './loginSessions.store';

vi.mock('@n8n/rest-api-client/api/login-sessions', () => ({
	getLoginSessions: vi.fn(),
	revokeLoginSession: vi.fn(),
	revokeAllOtherLoginSessions: vi.fn(),
}));

const getLoginSessions = vi.mocked(loginSessionsApi.getLoginSessions);
const revokeLoginSession = vi.mocked(loginSessionsApi.revokeLoginSession);
const revokeAllOtherLoginSessions = vi.mocked(loginSessionsApi.revokeAllOtherLoginSessions);

const session = (id: string, current = false): LoginSession => ({
	id,
	userAgent: 'Mozilla',
	ipAddress: '10.0.0.1',
	current,
	lastActiveAt: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	expiresAt: '2024-01-08T00:00:00.000Z',
});

const listResponse = (items: LoginSession[]): LoginSessionList => ({ items });

describe('loginSessions.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('fetches sessions and exposes whether other sessions exist', async () => {
		getLoginSessions.mockResolvedValue(listResponse([session('a', true), session('b')]));
		const store = useLoginSessionsStore();

		await store.fetchSessions();

		expect(store.sessions).toHaveLength(2);
		expect(store.hasOtherSessions).toBe(true);
	});

	it('removes a revoked session from state', async () => {
		getLoginSessions.mockResolvedValue(listResponse([session('a', true), session('b')]));
		revokeLoginSession.mockResolvedValue({ success: true });
		const store = useLoginSessionsStore();
		await store.fetchSessions();

		await store.revokeSession('b');

		expect(revokeLoginSession).toHaveBeenCalledWith(expect.anything(), 'b');
		expect(store.sessions.map((s) => s.id)).toEqual(['a']);
		expect(store.hasOtherSessions).toBe(false);
	});

	it('keeps only the current session after revoking all others', async () => {
		getLoginSessions.mockResolvedValue(
			listResponse([session('a', true), session('b'), session('c')]),
		);
		revokeAllOtherLoginSessions.mockResolvedValue({ revokedCount: 2 });
		const store = useLoginSessionsStore();
		await store.fetchSessions();

		await store.revokeAllOtherSessions();

		expect(store.sessions.map((s) => s.id)).toEqual(['a']);
	});
});
