import type { LdapConfigurationResponse } from '@n8n/api-types';
import { testDb } from '@n8n/backend-test-utils';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@n8n/constants';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { saveLdapSynchronization } from '@/modules/ldap.ee/helpers.ee';
import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';
import { setCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { defaultLdapConfig } from '../shared/ldap';

type LdapSyncEntry = {
	id: number;
	runMode: string;
	status: string;
	startedAt: string;
	endedAt: string;
	scanned: number;
	created: number;
	updated: number;
	disabled: number;
	error: string;
};
type SyncListBody = { data: LdapSyncEntry[]; nextCursor: string | null };
type ErrorBody = { message: string };

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
		await testDb.truncate(['User', 'AuthIdentity', 'AuthProviderSyncHistory']);
		// The LDAP config lives as a JSON blob in the `settings` table, which testDb.truncate
		// does not touch. Reset it to defaults so each test starts from a known, unset state
		// (otherwise a prior test's PUT — e.g. a stored password or an enabled sync timer —
		// leaks into the next and makes assertions order-dependent).
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
			// beforeEach resets the config to the defaults, so the response is exactly the
			// default configuration with the (unset) admin password reported as "".
			expect(response.body).toEqual({
				...LDAP_DEFAULT_CONFIGURATION,
				bindingAdminPassword: '',
			});
		});

		it('redacts bindingAdminPassword on read when set', async () => {
			testServer.license.enable('feat:ldap');

			// First PUT to set a real password
			await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					bindingAdminPassword: 'secretPassword123',
					loginEnabled: true,
				});

			// Then GET to verify it's redacted
			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			const body = response.body as LdapConfigurationResponse;

			expect(response.status).toBe(200);
			expect(body.bindingAdminPassword).toBe(CREDENTIAL_BLANKING_VALUE);
		});

		it('returns an empty string for bindingAdminPassword when it is unset', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			const body = response.body as LdapConfigurationResponse;

			expect(response.status).toBe(200);
			// Default config has no password stored, so it is reported as "" (not the blanking value).
			expect(body.bindingAdminPassword).toBe('');
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the ldap:manage scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/ldap');

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/ldap');

			expect(response.status).toBe(401);
		});
	});

	describe('PUT /settings/ldap', () => {
		it('sets the LDAP configuration with a full valid body and returns updated values', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					loginLabel: 'Updated LDAP Label',
					loginEnabled: true,
					bindingAdminPassword: 'mySecretPassword',
				});

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				loginLabel: 'Updated LDAP Label',
				loginEnabled: true,
				bindingAdminPassword: CREDENTIAL_BLANKING_VALUE,
			});

			// Verify persistence via GET
			const readResponse = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			const readBody = readResponse.body as LdapConfigurationResponse;
			expect(readBody.loginLabel).toBe('Updated LDAP Label');
			expect(readBody.loginEnabled).toBe(true);
		});

		it('accepts a GET response body as a PUT body and preserves redacted secrets', async () => {
			testServer.license.enable('feat:ldap');

			// PUT with a real password
			await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					loginLabel: 'Original Label',
					loginEnabled: true,
					bindingAdminPassword: 'secretPassword123',
				});

			// GET to read (password will be redacted)
			const getResponse = await testServer.publicApiAgentFor(owner).get('/settings/ldap');
			const getBody = getResponse.body as LdapConfigurationResponse;
			expect(getResponse.status).toBe(200);
			expect(getBody.bindingAdminPassword).toBe(CREDENTIAL_BLANKING_VALUE);

			// PUT the GET response back with only loginLabel changed
			const putResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...getBody,
					loginLabel: 'Round-tripped Label',
				});
			const putBody = putResponse.body as LdapConfigurationResponse;

			expect(putResponse.status).toBe(200);
			expect(putBody.loginLabel).toBe('Round-tripped Label');
			expect(putBody.bindingAdminPassword).toBe(CREDENTIAL_BLANKING_VALUE);

			// Verify the redacted round-trip left the ORIGINAL password intact (not blanked/overwritten)
			const ldapService = Container.get(LdapService);
			const storedConfig = await ldapService.loadConfig();
			expect(storedConfig.bindingAdminPassword).toBe('secretPassword123');
		});

		it('rejects a partial request body with 400', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({ loginLabel: 'LDAP' });

			expect(response.status).toBe(400);
			expect((response.body as ErrorBody).message).toMatch(/required property/i);
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
			expect((response.body as ErrorBody).message).toMatch(/connectionPort/i);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the ldap:manage scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:sync'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put('/settings/ldap')
				.send(defaultLdapConfig);

			expect(response.status).toBe(401);
		});

		it('rejects with 400 when trying to enable LDAP login with SSO as current authentication method', async () => {
			testServer.license.enable('feat:ldap');

			await setCurrentAuthenticationMethod('saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					loginEnabled: true,
				});

			expect(response.status).toBe(400);
			expect((response.body as ErrorBody).message).toContain(
				'LDAP cannot be enabled if SSO in enabled',
			);
		});

		it('cross-API: PUT via public API persists correctly for LdapService.loadConfig()', async () => {
			testServer.license.enable('feat:ldap');
			const testPassword = 'superSecretPassword123';

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/ldap')
				.send({
					...defaultLdapConfig,
					bindingAdminPassword: testPassword,
					loginLabel: 'Cross-API Test',
					loginEnabled: true,
				});

			expect(response.status).toBe(200);

			// Load via LdapService to verify encryption/storage
			const ldapService = Container.get(LdapService);
			const storedConfig = await ldapService.loadConfig();

			expect(storedConfig.loginLabel).toBe('Cross-API Test');
			expect(storedConfig.loginEnabled).toBe(true);
			expect(storedConfig.bindingAdminPassword).toBe(testPassword);
		});
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

			const body = response.body as SyncListBody;
			expect(response.status).toBe(200);
			expect(body.data).toHaveLength(2);
			// Only 2 rows and the default limit is 100, so there is no next page.
			expect(body.nextCursor).toBeNull();

			// Newest first (ordered by id DESC), so the 'live' run seeded last comes first,
			// carrying its exact seeded counts. providerType is omitted from the response.
			expect(body.data[0]).toMatchObject({
				runMode: 'live',
				status: 'success',
				scanned: 8,
				created: 3,
				updated: 1,
				disabled: 0,
			});
			expect(body.data[1]).toMatchObject({ runMode: 'dry', scanned: 10, created: 5, updated: 2 });
			expect(body.data[0]).not.toHaveProperty('providerType');
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

			// First page: newest row (created:2), with a cursor pointing at the next page.
			const firstResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/ldap/sync?limit=1');
			const firstPage = firstResponse.body as SyncListBody;
			expect(firstResponse.status).toBe(200);
			expect(firstPage.data).toHaveLength(1);
			expect(firstPage.data[0].created).toBe(2);
			expect(firstPage.nextCursor).not.toBeNull();

			// Second page: follow the cursor, expect the next row (created:1).
			const secondResponse = await testServer
				.publicApiAgentFor(owner)
				.get(`/settings/ldap/sync?cursor=${firstPage.nextCursor}`);
			const secondPage = secondResponse.body as SyncListBody;
			expect(secondResponse.status).toBe(200);
			expect(secondPage.data).toHaveLength(1);
			expect(secondPage.data[0].created).toBe(1);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/ldap/sync');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the ldap:sync scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:manage'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/ldap/sync');

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/ldap/sync');

			expect(response.status).toBe(401);
		});
	});

	describe('POST /settings/ldap/sync', () => {
		it('triggers sync with type:dry and returns latest history row', async () => {
			testServer.license.enable('feat:ldap');

			// Pre-seed a history row to return
			await saveLdapSynchronization({
				created: 1,
				scanned: 5,
				updated: 0,
				disabled: 0,
				startedAt: new Date(),
				endedAt: new Date(),
				status: 'success',
				error: '',
				runMode: 'dry',
			});

			const runSyncSpy = vi.spyOn(Container.get(LdapService), 'runSync').mockResolvedValue();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(200);
			expect(runSyncSpy).toHaveBeenCalledWith('dry');
			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('runMode');
		});

		it('triggers sync with type:live and returns latest history row', async () => {
			testServer.license.enable('feat:ldap');

			// Pre-seed a history row to return
			await saveLdapSynchronization({
				created: 2,
				scanned: 8,
				updated: 1,
				disabled: 0,
				startedAt: new Date(),
				endedAt: new Date(),
				status: 'success',
				error: '',
				runMode: 'live',
			});

			const runSyncSpy = vi.spyOn(Container.get(LdapService), 'runSync').mockResolvedValue();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'live' });

			expect(response.status).toBe(200);
			expect(runSyncSpy).toHaveBeenCalledWith('live');
			expect(response.body).toHaveProperty('id');
			expect(response.body).toHaveProperty('runMode');
		});

		it('rejects with 400 when missing type field', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({});

			expect(response.status).toBe(400);
		});

		it('rejects with 400 when type has invalid value', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'invalid-mode' });

			expect(response.status).toBe(400);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the ldap:sync scope', async () => {
			testServer.license.enable('feat:ldap');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['ldap:manage'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:ldap');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });

			expect(response.status).toBe(401);
		});
	});

	describe('Scope Isolation', () => {
		it('key with only ldap:manage cannot access /sync endpoints', async () => {
			testServer.license.enable('feat:ldap');
			const ldapManageOwner = await createOwnerWithApiKey({ scopes: ['ldap:manage'] });

			const getSyncResponse = await testServer
				.publicApiAgentFor(ldapManageOwner)
				.get('/settings/ldap/sync');
			expect(getSyncResponse.status).toBe(403);

			const postSyncResponse = await testServer
				.publicApiAgentFor(ldapManageOwner)
				.post('/settings/ldap/sync')
				.send({ type: 'dry' });
			expect(postSyncResponse.status).toBe(403);
		});

		it('key with only ldap:sync cannot access config endpoints', async () => {
			testServer.license.enable('feat:ldap');
			const ldapSyncOwner = await createOwnerWithApiKey({ scopes: ['ldap:sync'] });

			const getConfigResponse = await testServer
				.publicApiAgentFor(ldapSyncOwner)
				.get('/settings/ldap');
			expect(getConfigResponse.status).toBe(403);

			const putConfigResponse = await testServer
				.publicApiAgentFor(ldapSyncOwner)
				.put('/settings/ldap')
				.send(defaultLdapConfig);
			expect(putConfigResponse.status).toBe(403);
		});

		it('key with both ldap:manage and ldap:sync can access all endpoints', async () => {
			testServer.license.enable('feat:ldap');
			const fullAccessOwner = await createOwnerWithApiKey({
				scopes: ['ldap:manage', 'ldap:sync'],
			});

			const getConfigResponse = await testServer
				.publicApiAgentFor(fullAccessOwner)
				.get('/settings/ldap');
			expect(getConfigResponse.status).toBe(200);

			const getSyncResponse = await testServer
				.publicApiAgentFor(fullAccessOwner)
				.get('/settings/ldap/sync');
			expect(getSyncResponse.status).toBe(200);
		});
	});
});
