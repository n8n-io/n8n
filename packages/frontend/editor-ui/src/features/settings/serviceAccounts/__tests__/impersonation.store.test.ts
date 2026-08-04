import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImpersonationStore } from '../impersonation.store';

const startImpersonation = vi.fn();
const stopImpersonation = vi.fn();
const logout = vi.fn();

vi.mock('@n8n/rest-api-client/api/service-accounts', () => ({
	startImpersonation: (...args: unknown[]) => startImpersonation(...args),
	stopImpersonation: (...args: unknown[]) => stopImpersonation(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: '' } }),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({ logout }),
}));

describe('impersonation.store', () => {
	const assign = vi.fn();

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		Object.defineProperty(window, 'location', {
			value: { assign },
			writable: true,
		});
	});

	const actor = {
		id: 'human-1',
		email: 'admin@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
	};

	it('is not impersonating by default', () => {
		const store = useImpersonationStore();

		expect(store.isImpersonating).toBe(false);
		expect(store.actorName).toBe('');
	});

	it('reflects the actor from the login response', () => {
		const store = useImpersonationStore();

		store.setState({ actor, serviceAccountName: 'Deploy Bot' });

		expect(store.isImpersonating).toBe(true);
		expect(store.actorName).toBe('Ada Lovelace');
		expect(store.serviceAccountName).toBe('Deploy Bot');
	});

	it('falls back to the actor email when there is no name', () => {
		const store = useImpersonationStore();

		store.setState({ actor: { id: 'human-1', email: 'admin@example.com' } });

		expect(store.actorName).toBe('admin@example.com');
	});

	it('clears the service account name when the actor goes away', () => {
		const store = useImpersonationStore();
		store.setState({ actor, serviceAccountName: 'Deploy Bot' });

		store.reset();

		expect(store.isImpersonating).toBe(false);
		expect(store.serviceAccountName).toBeNull();
	});

	it('start() calls the API then hard-navigates', async () => {
		const store = useImpersonationStore();

		await store.start('sa-1');

		expect(startImpersonation).toHaveBeenCalledWith(expect.anything(), 'sa-1');
		// Hard navigation, not a router push: `initializeAuthenticatedFeatures` is
		// guarded by a flag nothing resets, so a soft swap would leave the service
		// account looking at the human's projects and favourites.
		expect(assign).toHaveBeenCalledWith('/home/workflows');
	});

	it('stop() calls the exit API and never logout', async () => {
		const store = useImpersonationStore();
		store.setState({ actor, serviceAccountName: 'Deploy Bot' });

		await store.stop();

		expect(stopImpersonation).toHaveBeenCalled();
		// `logout()` would end the session server-side and clear the browser-id key
		// the restored session is bound to.
		expect(logout).not.toHaveBeenCalled();
		expect(assign).toHaveBeenCalledWith('/settings/service-accounts');
	});

	it('stop() does not navigate when the API fails', async () => {
		stopImpersonation.mockRejectedValueOnce(new Error('nope'));
		const store = useImpersonationStore();

		await expect(store.stop()).rejects.toThrow('nope');

		expect(assign).not.toHaveBeenCalled();
	});
});
