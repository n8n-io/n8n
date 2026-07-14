import { testDb } from '@n8n/backend-test-utils';
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

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS;
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

		it('redacts the signing private key on read', async () => {
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
			expect(response.body.signingCertificate).toBe(RSA_TEST_CERTIFICATE);
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
});
