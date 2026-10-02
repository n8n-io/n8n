import { testDb } from '@n8n/backend-test-utils';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@n8n/constants';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { getLdapUsers, saveLdapSynchronization } from '@/modules/ldap.ee/helpers.ee';
import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { defaultLdapConfig } from '../shared/ldap';

describe('LDAP configuration in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'ldap'],
	});
	const licenseErrorMessage = new FeatureNotLicensedError('feat:ldap').message;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'AuthIdentity',
			'AuthProviderSyncHistory',
			'ProjectRelation',
			'Project',
			'User',
		]);

		await Container.get(SettingsRepository).update(
			{ key: LDAP_FEATURE_NAME },
			{ value: JSON.stringify(LDAP_DEFAULT_CONFIGURATION), loadOnStartup: true },
		);
		Container.get(LdapService).stopSync();
		await setCurrentAuthenticationMethod('email');
		owner = await createOwnerWithApiKey();
	});

	describe('GET /settings/ldap', () => {
		it('returns the current LDAP configuration when licensed', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual({
				...LDAP_DEFAULT_CONFIGURATION,
				bindingAdminPassword: '',
			});
		});

		it('redacts bindingAdminPassword on read when set', async () => {
			testServer.license.enable('feat:ldap');

			const configuration = {
				...defaultLdapConfig,
				bindingAdminPassword: 'secretPassword123',
				loginEnabled: true,
			};
			await testServer.publicApiAgentFor(owner).put('/settings/ldap').send(configuration);

			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual({
				...configuration,
				bindingAdminPassword: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: licenseErrorMessage });
		});

		it('rejects with 403 when the API key lacks the ldap:manage scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:sync'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/ldap');

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/ldap');

			expect(response.status).toBe(401);
			expect(response.body).toStrictEqual({ message: 'Unauthorized' });
		});
	});

	describe('PUT /settings/ldap', () => {
		it('sets the LDAP configuration with a full valid body and returns updated values', async () => {
			testServer.license.enable('feat:ldap');

			const configuration = {
				...defaultLdapConfig,
				loginLabel: 'Updated LDAP Label',
				loginEnabled: true,
				bindingAdminPassword: 'mySecretPassword',
			};
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send(configuration);

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual({
				...configuration,
				bindingAdminPassword: CREDENTIAL_BLANKING_VALUE,
			});

			const readResponse = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			expect(readResponse.body).toStrictEqual({
				...configuration,
				bindingAdminPassword: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('accepts a GET response body as a PUT body and preserves redacted secrets', async () => {
			testServer.license.enable('feat:ldap');

			const configuration = {
				...defaultLdapConfig,
				loginLabel: 'Original Label',
				loginEnabled: true,
				bindingAdminPassword: 'secretPassword123',
			};
			await testServer.publicApiAgentFor(owner).put('/settings/ldap').send(configuration);

			const getResponse = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			const redacted = {
				...configuration,
				bindingAdminPassword: CREDENTIAL_BLANKING_VALUE,
			};
			expect(getResponse.status).toBe(200);
			expect(getResponse.body).toStrictEqual(redacted);

			const putResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...getResponse.body,
					loginLabel: 'Round-tripped Label',
				});

			expect(putResponse.status).toBe(200);
			expect(putResponse.body).toStrictEqual({
				...redacted,
				loginLabel: 'Round-tripped Label',
			});

			const storedConfig = await Container.get(LdapService).loadConfig();
			expect(storedConfig).toStrictEqual({
				...configuration,
				loginLabel: 'Round-tripped Label',
			});
		});

		it('rejects unknown properties with 400', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					unknownField: 'nope',
				});

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: "request/body Unrecognized key(s) in object: 'unknownField'",
			});
		});

		it('rejects a partial request body with 400', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({ loginLabel: 'LDAP' });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: "request/body must have required property 'loginEnabled'",
			});
		});

		it('rejects malformed types with 400', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					connectionPort: 'not-a-number',
					loginEnabled: true,
				});

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: 'request/body/connectionPort Expected number, received string',
			});
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: licenseErrorMessage });
		});

		it('rejects with 403 when the API key lacks the ldap:manage scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:sync'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(401);
			expect(response.body).toStrictEqual({ message: 'Unauthorized' });
		});

		it.each(['saml', 'oidc', 'token-exchange'] as const)(
			'rejects with 400 when trying to enable LDAP login while %s is the current authentication method',
			async (currentMethod) => {
				testServer.license.enable('feat:ldap');

				await setCurrentAuthenticationMethod(currentMethod);

				const response = await testServer
					.publicApiAgentFor(owner)
					.put('/settings/ldap')
					.send({
						...defaultLdapConfig,
						loginEnabled: true,
					});

				expect(response.status).toBe(400);
				expect(response.body).toStrictEqual({
					message: `Cannot switch ldap login enabled state when an authentication method other than email or ldap is active (current: ${currentMethod})`,
				});
			},
		);
	});

	describe('GET /settings/ldap/sync', () => {
		it('returns paginated sync history when licensed', async () => {
			testServer.license.enable('feat:ldap');

			// Seed 2 sync history rows
			await saveLdapSynchronization({
				created: 5,
				scanned: 10,
				updated: 2,
				disabled: 0,
				startedAt: new Date('2025-01-01'),
				endedAt: new Date('2025-01-01T00:00:30'),
				status: 'success',
				error: '',
				runMode: 'dry',
			});

			await saveLdapSynchronization({
				created: 3,
				scanned: 8,
				updated: 1,
				disabled: 0,
				startedAt: new Date('2025-01-02'),
				endedAt: new Date('2025-01-02T00:00:20'),
				status: 'success',
				error: '',
				runMode: 'live',
			});

			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap/sync');

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual({
				data: [
					{
						id: expect.any(Number),
						runMode: 'live',
						status: 'success',
						startedAt: new Date('2025-01-02').toISOString(),
						endedAt: new Date('2025-01-02T00:00:20').toISOString(),
						scanned: 8,
						created: 3,
						updated: 1,
						disabled: 0,
						error: '',
					},
					{
						id: expect.any(Number),
						runMode: 'dry',
						status: 'success',
						startedAt: new Date('2025-01-01').toISOString(),
						endedAt: new Date('2025-01-01T00:00:30').toISOString(),
						scanned: 10,
						created: 5,
						updated: 2,
						disabled: 0,
						error: '',
					},
				],
				nextCursor: null,
			});
		});

		it('paginates the history with limit and cursor', async () => {
			testServer.license.enable('feat:ldap');

			// Seed 3 rows with distinct `created` counts so we can prove ordering across pages.
			for (let i = 0; i < 3; i++) {
				await saveLdapSynchronization({
					created: i,
					scanned: 10,
					updated: 0,
					disabled: 0,
					startedAt: new Date(),
					endedAt: new Date(),
					status: 'success',
					error: '',
					runMode: 'dry',
				});
			}

			const syncPageEntry = (created: number) => ({
				id: expect.any(Number),
				runMode: 'dry',
				status: 'success',
				startedAt: expect.any(String),
				endedAt: expect.any(String),
				scanned: 10,
				created,
				updated: 0,
				disabled: 0,
				error: '',
			});

			const firstResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/ldap/sync?limit=1');
			expect(firstResponse.status).toBe(200);
			expect(firstResponse.body).toStrictEqual({
				data: [syncPageEntry(2)],
				nextCursor: expect.any(String),
			});

			const secondResponse = await testServer
				.publicApiAgentFor(owner)
				.get(`/settings/ldap/sync?cursor=${firstResponse.body.nextCursor}`);
			expect(secondResponse.status).toBe(200);
			expect(secondResponse.body).toStrictEqual({
				data: [syncPageEntry(1)],
				nextCursor: expect.any(String),
			});

			const lastResponse = await testServer
				.publicApiAgentFor(owner)
				.get(`/settings/ldap/sync?cursor=${secondResponse.body.nextCursor}`);
			expect(lastResponse.status).toBe(200);
			expect(lastResponse.body).toStrictEqual({
				data: [syncPageEntry(0)],
				nextCursor: null,
			});
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap/sync');

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: licenseErrorMessage });
		});

		it('rejects with 403 when the API key lacks the ldap:sync scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:manage'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/ldap/sync');

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/ldap/sync');

			expect(response.status).toBe(401);
			expect(response.body).toStrictEqual({ message: "'X-N8N-API-KEY' header required" });
		});
	});

	describe('POST /settings/ldap/sync', () => {
		it('creates users for a live sync but not for a dry run', async () => {
			testServer.license.enable('feat:ldap');

			await testServer.publicApiAgentFor(owner).put('/settings/ldap').send(defaultLdapConfig);

			const ldapUser = {
				dn: 'uid=newuser,ou=users,dc=example,dc=com',
				uid: 'newuser',
				mail: 'newuser@example.com',
				givenName: 'New',
				sn: 'User',
			};
			vi.spyOn(Container.get(LdapService), 'searchWithAdminBinding').mockResolvedValue([ldapUser]);

			const dryResponse = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			const syncResult = (runMode: 'dry' | 'live') => ({
				id: expect.any(Number),
				runMode,
				status: 'success',
				startedAt: expect.any(String),
				endedAt: expect.any(String),
				scanned: 1,
				created: 1,
				updated: 0,
				disabled: 0,
				error: '',
			});

			expect(dryResponse.status).toBe(200);
			expect(dryResponse.body).toStrictEqual(syncResult('dry'));
			expect(await getLdapUsers()).toStrictEqual([]);

			const liveResponse = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'live' });

			expect(liveResponse.status).toBe(200);
			expect(liveResponse.body).toStrictEqual(syncResult('live'));
			const users = await getLdapUsers();
			expect(users).toHaveLength(1);
			expect(users[0].email).toBe('newuser@example.com');
		});

		it('rejects with 400 when missing type field', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({});

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: "request/body must have required property 'type'",
			});
		});

		it('rejects with 400 when type has invalid value', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'invalid-mode' });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: 'request/body/type must be equal to one of the allowed values: live, dry',
			});
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: licenseErrorMessage });
		});

		it('rejects with 403 when the API key lacks the ldap:sync scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:manage'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(401);
			expect(response.body).toStrictEqual({ message: "'X-N8N-API-KEY' header required" });
		});
	});
});
