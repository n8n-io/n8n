import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useCredentialsStore } from '@/stores/credentials.store';

describe('store', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
		server.createList('credential', 3);
	});

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	afterAll(() => {
		server.shutdown();
	});

	describe('credentials', () => {
		describe('fetchCredentialTypes()', () => {
			it('should fetch all credential types', async () => {
				const credentialsStore = useCredentialsStore();
				await credentialsStore.fetchCredentialTypes(false);

				expect(credentialsStore.allCredentialTypes).toHaveLength(8);
			});
		});

		describe('fetchAllCredentials()', () => {
			it('should fetch all credentials', async () => {
				const credentialsStore = useCredentialsStore();
				await credentialsStore.fetchAllCredentials();

				expect(credentialsStore.allCredentials).toHaveLength(3);
			});
		});
	});
});
