import { testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';
import {
	RSA_TEST_CERTIFICATE,
	RSA_TEST_PRIVATE_KEY,
} from '@/modules/sso-saml/__tests__/saml-signing-test-fixtures';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { sampleConfig } from '../saml/sample-metadata';
import { setupTestServer } from '@test-integration/utils';

describe('SAML SSO configuration in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'saml'],
	});
	const licenseErrorMessage = new FeatureNotLicensedError('feat:saml').message;

	const setManagedByEnv = (value: boolean) => {
		Container.get(InstanceSettingsLoaderConfig).ssoManagedByEnv = value;
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		setManagedByEnv(false);
		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS;
		setManagedByEnv(false);
	});

	describe('GET /settings/sso/saml', () => {
		it('returns the current SAML configuration when licensed', async () => {
			testServer.license.enable('feat:saml');
			const samlService = Container.get(SamlService);

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				loginEnabled: samlService.samlPreferences.loginEnabled,
				loginLabel: samlService.samlPreferences.loginLabel,
				ignoreSSL: false,
				loginBinding: 'redirect',
				acsBinding: 'post',
				authnRequestsSigned: false,
				wantAssertionsSigned: true,
				wantMessageSigned: true,
			});
			expect(response.body.entityID).toContain('/rest/sso/saml/metadata');
			expect(response.body.returnUrl).toContain('/rest/sso/saml/acs');
		});

		it('redacts certificates and secrets on read', async () => {
			testServer.license.enable('feat:saml');
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await testServer
				.authAgentFor(owner)
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				});

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');

			expect(response.status).toBe(200);
			expect(response.body.signingPrivateKey).toBe(CREDENTIAL_BLANKING_VALUE);
			expect(response.body.signingCertificate).toBe(CREDENTIAL_BLANKING_VALUE);
			expect(response.body.metadata).toBe(CREDENTIAL_BLANKING_VALUE);
			expect(response.body.metadata).not.toContain('BEGIN CERTIFICATE');
			expect(response.body.signingCertificate).not.toContain('BEGIN CERTIFICATE');
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the saml:manage scope', async () => {
			testServer.license.enable('feat:saml');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/settings/sso/saml');

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings/sso/saml');

			expect(response.status).toBe(401);
		});

		it('reads through the SAML service without reimplementing preferences', async () => {
			testServer.license.enable('feat:saml');
			const samlService = Container.get(SamlService);

			const response = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');

			expect(response.status).toBe(200);
			expect(response.body.loginEnabled).toBe(samlService.samlPreferences.loginEnabled);
			expect(response.body.loginLabel).toBe(samlService.samlPreferences.loginLabel);
		});
	});

	describe('POST /settings/sso/saml', () => {
		it('sets the SAML configuration and returns the updated values', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml')
				.send({
					...sampleConfig,
					loginLabel: 'Updated SAML Label',
				});

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				loginLabel: 'Updated SAML Label',
				loginEnabled: sampleConfig.loginEnabled,
				ignoreSSL: sampleConfig.ignoreSSL,
			});
			expect(response.body.entityID).toContain('/rest/sso/saml/metadata');
			expect(response.body.returnUrl).toContain('/rest/sso/saml/acs');

			const readResponse = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');
			expect(readResponse.body.loginLabel).toBe('Updated SAML Label');
		});

		it('rejects a malformed request body with 400', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml')
				.send({ ignoreSSL: 'not-a-boolean' });

			expect(response.status).toBe(400);
		});

		it('rejects a well-formed body with invalid values with 400', async () => {
			testServer.license.enable('feat:saml');
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			const samlService = Container.get(SamlService);
			type PrivatePrefs = { _samlPreferences: typeof samlService.samlPreferences };
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingPrivateKey = undefined;
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingCertificate = undefined;

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml')
				.send({ authnRequestsSigned: true });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/settings/sso/saml')
				.send({ loginLabel: 'SAML' });

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml')
				.send({ loginLabel: 'SAML' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the saml:manage scope', async () => {
			testServer.license.enable('feat:saml');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/settings/sso/saml')
				.send({ loginLabel: 'SAML' });

			expect(response.status).toBe(403);
		});

		it('rejects a write with 409 when managed declaratively, but still allows reads', async () => {
			testServer.license.enable('feat:saml');
			setManagedByEnv(true);

			const writeResponse = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml')
				.send({ loginLabel: 'Blocked Label' });

			expect(writeResponse.status).toBe(409);
			expect(writeResponse.body).toMatchObject({
				message:
					'SSO configuration is managed declaratively and cannot be modified through the API',
			});

			const readResponse = await testServer.publicApiAgentFor(owner).get('/settings/sso/saml');
			expect(readResponse.status).toBe(200);
			expect(readResponse.body.loginLabel).not.toBe('Blocked Label');
		});
	});
});
