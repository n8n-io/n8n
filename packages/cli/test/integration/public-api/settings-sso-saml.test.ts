import { testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';
import { setSamlLoginEnabled } from '@/modules/sso-saml/saml-helpers';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { sampleConfig } from '../saml/sample-metadata';

describe('SAML toggle in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({
		endpointGroups: ['publicApi', 'saml'],
		enabledFeatures: ['feat:saml'],
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
		await setSamlLoginEnabled(false);
		await setCurrentAuthenticationMethod('email');

		owner = await createOwnerWithApiKey();
		await Container.get(SamlService).setSamlPreferences(sampleConfig);
	});

	afterEach(() => {
		setManagedByEnv(false);
	});

	describe('POST /settings/sso/saml/toggle', () => {
		it('enables SAML login', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: true });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ loginEnabled: true });
			expect(getCurrentAuthenticationMethod()).toBe('saml');
		});

		it('disables SAML login', async () => {
			testServer.license.enable('feat:saml');
			await setSamlLoginEnabled(true);
			await setCurrentAuthenticationMethod('saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: false });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ loginEnabled: false });
			expect(getCurrentAuthenticationMethod()).toBe('email');
		});

		it('rejects a malformed request body with 400', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: 'not-a-boolean' });

			expect(response.status).toBe(400);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:saml');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: true });

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: true });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the saml:manage scope', async () => {
			testServer.license.enable('feat:saml');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: true });

			expect(response.status).toBe(403);
		});

		it('rejects a write with 409 when SSO is managed via environment variables', async () => {
			testServer.license.enable('feat:saml');
			setManagedByEnv(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/settings/sso/saml/toggle')
				.send({ loginEnabled: true });

			expect(response.status).toBe(409);
			expect(getCurrentAuthenticationMethod()).toBe('email');
		});
	});
});
