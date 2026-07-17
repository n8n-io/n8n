import { testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { vi } from 'vitest';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import {
	OIDC_CLIENT_SECRET_REDACTED_VALUE,
	OIDC_PREFERENCES_DB_KEY,
} from '@/modules/sso-oidc/constants';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

// OIDC config writes validate the provider by running discovery against the discovery
// endpoint. Stub it so the tests exercise our handler without hitting the network.
vi.mock('openid-client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('openid-client')>();
	return {
		...actual,
		discovery: vi.fn().mockResolvedValue({}),
	};
});

const validConfig = {
	clientId: 'n8n-client',
	clientSecret: 'super-secret',
	discoveryEndpoint: 'https://accounts.example.com/.well-known/openid-configuration',
	loginEnabled: false,
	prompt: 'consent' as const,
	authenticationContextClassReference: ['mfa'],
	additionalScopes: 'groups',
};

describe('OIDC SSO configuration in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'oidc'],
	});
	const licenseErrorMessage = new FeatureNotLicensedError('feat:oidc').message;

	const setManagedByEnv = (value: boolean) => {
		Container.get(InstanceSettingsLoaderConfig).ssoManagedByEnv = value;
	};

	// Reset both the persisted and in-memory OIDC config to defaults between tests.
	const resetOidcConfig = async () => {
		await Container.get(SettingsRepository).delete({ key: OIDC_PREFERENCES_DB_KEY });
		await Container.get(OidcService).init();
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		setManagedByEnv(false);
		await resetOidcConfig();
		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		setManagedByEnv(false);
	});

	describe('GET /settings/sso/oidc', () => {
		it('returns the current OIDC configuration when licensed', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				clientId: expect.any(String),
				loginEnabled: false,
				prompt: 'select_account',
				authenticationContextClassReference: [],
				additionalScopes: '',
			});
			expect(typeof response.body.discoveryEndpoint).toBe('string');
		});

		it('exposes exactly the fields the UI configures, and nothing more', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');

			expect(response.status).toBe(200);
			expect(Object.keys(response.body).sort()).toEqual(
				[
					'additionalScopes',
					'authenticationContextClassReference',
					'clientId',
					'clientSecret',
					'discoveryEndpoint',
					'loginEnabled',
					'prompt',
				].sort(),
			);
		});

		it('redacts the client secret on read', async () => {
			testServer.license.enable('feat:oidc');
			await testServer.publicApiAgentFor(owner).put('/settings/sso/oidc').send(validConfig);

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');

			expect(response.status).toBe(200);
			expect(response.body.clientSecret).toBe(OIDC_CLIENT_SECRET_REDACTED_VALUE);
			expect(response.body.clientSecret).not.toBe(validConfig.clientSecret);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the oidc:manage scope', async () => {
			testServer.license.enable('feat:oidc');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/sso/oidc');

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/sso/oidc');

			expect(response.status).toBe(401);
		});
	});

	describe('PUT /settings/sso/oidc', () => {
		it('sets the configuration and returns the updated values with the secret redacted', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send(validConfig);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				clientId: validConfig.clientId,
				discoveryEndpoint: validConfig.discoveryEndpoint,
				prompt: 'consent',
				authenticationContextClassReference: ['mfa'],
				additionalScopes: 'groups',
			});
			expect(response.body.clientSecret).toBe(OIDC_CLIENT_SECRET_REDACTED_VALUE);
		});

		it('takes effect the same way as the UI (write via public API, read via internal API)', async () => {
			testServer.license.enable('feat:oidc');

			await testServer.publicApiAgentFor(owner).put('/settings/sso/oidc').send(validConfig);

			// internal REST responses are wrapped in `{ data }`; the UI client unwraps it.
			const internal = await testServer.authAgentFor(owner).get('/sso/oidc/config');

			expect(internal.status).toBe(200);
			expect(internal.body.data.clientId).toBe(validConfig.clientId);
			expect(internal.body.data.discoveryEndpoint).toBe(validConfig.discoveryEndpoint);
			expect(internal.body.data.clientSecret).toBe(OIDC_CLIENT_SECRET_REDACTED_VALUE);
		});

		it('reads back a configuration written through the internal API (public API is a faithful stand-in)', async () => {
			testServer.license.enable('feat:oidc');

			await testServer.authAgentFor(owner).post('/sso/oidc/config').send(validConfig);

			const publicRead = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');

			expect(publicRead.status).toBe(200);
			expect(publicRead.body.clientId).toBe(validConfig.clientId);
			expect(publicRead.body.discoveryEndpoint).toBe(validConfig.discoveryEndpoint);
			expect(publicRead.body.clientSecret).toBe(OIDC_CLIENT_SECRET_REDACTED_VALUE);
		});

		it('toggles loginEnabled both ways', async () => {
			testServer.license.enable('feat:oidc');

			const enabled = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send({ ...validConfig, loginEnabled: true });
			expect(enabled.status).toBe(200);
			expect(enabled.body.loginEnabled).toBe(true);

			const disabled = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send({ ...validConfig, loginEnabled: false });
			expect(disabled.status).toBe(200);
			expect(disabled.body.loginEnabled).toBe(false);
		});

		it('keeps the stored secret when the redacted sentinel is submitted', async () => {
			testServer.license.enable('feat:oidc');
			await testServer.publicApiAgentFor(owner).put('/settings/sso/oidc').send(validConfig);

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send({
					...validConfig,
					clientId: 'updated-client',
					clientSecret: OIDC_CLIENT_SECRET_REDACTED_VALUE,
				});

			expect(response.status).toBe(200);
			expect(response.body.clientId).toBe('updated-client');

			const stored = await Container.get(OidcService).loadConfig(true);
			expect(stored.clientSecret).toBe(validConfig.clientSecret);
		});

		it('rejects a malformed body with 400', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send({ clientId: 'only-id' });

			expect(response.status).toBe(400);
		});

		it('rejects a well-formed body with invalid values with 400', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send({ ...validConfig, discoveryEndpoint: 'not-a-url' });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:oidc');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put('/settings/sso/oidc')
				.send(validConfig);

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the API key lacks the oidc:manage scope', async () => {
			testServer.license.enable('feat:oidc');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put('/settings/sso/oidc')
				.send(validConfig);

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send(validConfig);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('refuses the write with 409 when managed declaratively, and still allows reads', async () => {
			testServer.license.enable('feat:oidc');
			setManagedByEnv(true);

			const write = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/sso/oidc')
				.send(validConfig);

			expect(write.status).toBe(409);
			expect(write.body).toHaveProperty('message');

			const read = await testServer.publicApiAgentFor(owner).get('/settings/sso/oidc');
			expect(read.status).toBe(200);
		});
	});
});
