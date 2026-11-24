import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useCredentialsStore } from './credentials.store';
import * as credentialsApi from './credentials.api';
import type { ICredentialType } from 'n8n-workflow';

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

			describe('with calls that start together', () => {
				const credentialType = {
					name: 'testApi',
					displayName: 'Test API',
					properties: [],
				} as ICredentialType;

				afterEach(() => {
					vi.restoreAllMocks();
				});

				it('should share one request', async () => {
					const { promise, resolve } = Promise.withResolvers<ICredentialType[]>();
					const spy = vi.spyOn(credentialsApi, 'getCredentialTypes').mockReturnValueOnce(promise);
					const credentialsStore = useCredentialsStore();

					const first = credentialsStore.fetchCredentialTypes(false);
					const second = credentialsStore.fetchCredentialTypes(false);
					resolve([credentialType]);
					await Promise.all([first, second]);

					expect(spy).toHaveBeenCalledTimes(1);
					expect(credentialsStore.allCredentialTypes).toEqual([credentialType]);
				});

				it('should join a forced request that runs', async () => {
					const { promise, resolve } = Promise.withResolvers<ICredentialType[]>();
					const spy = vi.spyOn(credentialsApi, 'getCredentialTypes').mockReturnValueOnce(promise);
					const credentialsStore = useCredentialsStore();

					const forced = credentialsStore.fetchCredentialTypes(true);
					const joined = credentialsStore.fetchCredentialTypes(false);
					resolve([credentialType]);
					await Promise.all([forced, joined]);

					expect(spy).toHaveBeenCalledTimes(1);
				});

				it('should still send a forced request while another request runs', async () => {
					const spy = vi
						.spyOn(credentialsApi, 'getCredentialTypes')
						.mockResolvedValue([credentialType]);
					const credentialsStore = useCredentialsStore();

					await Promise.all([
						credentialsStore.fetchCredentialTypes(false),
						credentialsStore.fetchCredentialTypes(true),
					]);

					expect(spy).toHaveBeenCalledTimes(2);
				});

				it('should keep a newer response when an older request ends after it', async () => {
					const older = Promise.withResolvers<ICredentialType[]>();
					const newer = Promise.withResolvers<ICredentialType[]>();
					vi.spyOn(credentialsApi, 'getCredentialTypes')
						.mockReturnValueOnce(older.promise)
						.mockReturnValueOnce(newer.promise);
					const credentialsStore = useCredentialsStore();
					const newerType = { ...credentialType, displayName: 'Test API (new)' };

					const first = credentialsStore.fetchCredentialTypes(false);
					const second = credentialsStore.fetchCredentialTypes(true);
					newer.resolve([newerType]);
					await second;
					older.resolve([credentialType]);
					await first;

					expect(credentialsStore.allCredentialTypes).toEqual([newerType]);
				});

				it('should reject every caller of a failed request, and retry on the next call', async () => {
					const error = new Error('credential types');
					const spy = vi
						.spyOn(credentialsApi, 'getCredentialTypes')
						.mockRejectedValueOnce(error)
						.mockResolvedValueOnce([credentialType]);
					const credentialsStore = useCredentialsStore();

					const first = credentialsStore.fetchCredentialTypes(false);
					const second = credentialsStore.fetchCredentialTypes(false);
					await expect(first).rejects.toBe(error);
					await expect(second).rejects.toBe(error);
					expect(spy).toHaveBeenCalledTimes(1);

					await credentialsStore.fetchCredentialTypes(false);

					expect(spy).toHaveBeenCalledTimes(2);
					expect(credentialsStore.allCredentialTypes).toEqual([credentialType]);
				});
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
