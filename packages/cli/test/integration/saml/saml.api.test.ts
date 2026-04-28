// Global mocks in test/setup-mocks.ts replace `node:fs` with jest auto-mocks,
// which breaks express view lookup in the SAML connection-test round-trip.
// Restore the real fs so the ACS handler can render its handlebars template.
jest.unmock('node:fs');

import type { SamlPreferences } from '@n8n/api-types';
import {
	createTeamProject,
	getProjectRoleForUser,
	randomEmail,
	randomName,
	randomValidPassword,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { type User, UserRepository, RoleRepository, RoleMappingRuleRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import {
	EC_TEST_CERTIFICATE,
	EC_TEST_PRIVATE_KEY,
	RSA_MISMATCHED_CERTIFICATE,
	RSA_TEST_CERTIFICATE,
	RSA_TEST_PRIVATE_KEY,
} from '@/modules/sso-saml/__tests__/saml-signing-test-fixtures';

import { TEMPLATES_DIR } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { setSamlLoginEnabled } from '@/modules/sso-saml/saml-helpers';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

import { sampleConfig } from './sample-metadata';
import { createOwner, createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let someUser: User;
let owner: User;
let authMemberAgent: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;

async function enableSaml(enable: boolean) {
	await setSamlLoginEnabled(enable);
}

const testServer = utils.setupTestServer({
	endpointGroups: ['me', 'saml'],
	enabledFeatures: ['feat:saml'],
});

const memberPassword = randomValidPassword();

beforeAll(async () => {
	owner = await createOwner();
	someUser = await createUser({ password: memberPassword });
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(someUser);
	Container.get(GlobalConfig).sso.saml.loginEnabled = true;
});

beforeEach(async () => await enableSaml(false));

describe('Instance owner', () => {
	describe('PATCH /me', () => {
		test('should succeed with valid inputs', async () => {
			await enableSaml(false);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: owner.email,
					firstName: randomName(),
					lastName: randomName(),
				})
				.expect(200);
		});

		test('should throw BadRequestError if email is changed when SAML is enabled', async () => {
			await enableSaml(true);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: randomEmail(),
					firstName: randomName(),
					lastName: randomName(),
				})
				.expect(400, { code: 400, message: 'SAML user may not change their email' });
		});
	});

	describe('PATCH /password', () => {
		test('should throw BadRequestError if password is changed when SAML is enabled', async () => {
			await enableSaml(true);
			await authMemberAgent
				.patch('/me/password')
				.send({
					currentPassword: memberPassword,
					newPassword: randomValidPassword(),
				})
				.expect(400, {
					code: 400,
					message: 'With SAML enabled, users need to use their SAML provider to change passwords',
				});
		});
	});

	describe('POST /sso/saml/config', () => {
		test('should post saml config', async () => {
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					loginEnabled: true,
				})
				.expect(200);
			expect(getCurrentAuthenticationMethod()).toBe('saml');
		});

		test('should return 400 on invalid config', async () => {
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					loginBinding: 'invalid',
				})
				.expect(400);
			expect(getCurrentAuthenticationMethod()).toBe('email');
		});
	});

	describe('POST /sso/saml/config/toggle', () => {
		test('should toggle saml as default authentication method', async () => {
			await enableSaml(true);
			expect(getCurrentAuthenticationMethod()).toBe('saml');

			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: false,
				})
				.expect(200);
			expect(getCurrentAuthenticationMethod()).toBe('email');

			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: true,
				})
				.expect(200);
			expect(getCurrentAuthenticationMethod()).toBe('saml');
		});
	});

	describe('POST /sso/saml/config/toggle', () => {
		test('should fail enable saml if default authentication is not email', async () => {
			await enableSaml(true);

			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: false,
				})
				.expect(200);
			expect(getCurrentAuthenticationMethod()).toBe('email');

			await setCurrentAuthenticationMethod('ldap');
			expect(getCurrentAuthenticationMethod()).toBe('ldap');

			await authOwnerAgent
				.post('/sso/saml/config/toggle')
				.send({
					loginEnabled: true,
				})
				.expect(500);

			expect(getCurrentAuthenticationMethod()).toBe('ldap');
			await setCurrentAuthenticationMethod('saml');
		});
	});
});

describe('Check endpoint permissions', () => {
	beforeEach(async () => {
		await enableSaml(true);
	});

	describe('Owner', () => {
		test('should be able to access GET /sso/saml/metadata', async () => {
			await authOwnerAgent.get('/sso/saml/metadata').expect(200);
		});

		test('should be able to access GET /sso/saml/config', async () => {
			await authOwnerAgent.get('/sso/saml/config').expect(200);
		});

		test('should be able to access POST /sso/saml/config', async () => {
			await authOwnerAgent.post('/sso/saml/config').expect(200);
		});

		test('should be able to access POST /sso/saml/config/toggle', async () => {
			await authOwnerAgent.post('/sso/saml/config/toggle').expect(400);
		});

		test('should be able to access GET /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await authOwnerAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access POST /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await authOwnerAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access GET /sso/saml/initsso', async () => {
			await authOwnerAgent.get('/sso/saml/initsso').expect(200);
		});

		test('should be able to access POST /sso/saml/config/test', async () => {
			await authOwnerAgent
				.post('/sso/saml/config/test')
				.send({ metadata: sampleConfig.metadata })
				.expect(200);
		});
	});

	describe('Authenticated Member', () => {
		test('should be able to access GET /sso/saml/metadata', async () => {
			await authMemberAgent.get('/sso/saml/metadata').expect(200);
		});

		test('should be able to access GET /sso/saml/config', async () => {
			await authMemberAgent.get('/sso/saml/config').expect(200);
		});

		test('should NOT be able to access POST /sso/saml/config', async () => {
			await authMemberAgent.post('/sso/saml/config').expect(403);
		});

		test('should NOT be able to access POST /sso/saml/config/toggle', async () => {
			await authMemberAgent.post('/sso/saml/config/toggle').expect(403);
		});

		test('should be able to access GET /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await authMemberAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access POST /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await authMemberAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access GET /sso/saml/initsso', async () => {
			await authMemberAgent.get('/sso/saml/initsso').expect(200);
		});

		test('should NOT be able to access POST /sso/saml/config/test', async () => {
			await authMemberAgent.post('/sso/saml/config/test').expect(403);
		});
	});
	describe('Non-Authenticated User', () => {
		test('should be able to access /sso/saml/metadata', async () => {
			await testServer.authlessAgent.get('/sso/saml/metadata').expect(200);
		});

		test('should NOT be able to access GET /sso/saml/config', async () => {
			await testServer.authlessAgent.get('/sso/saml/config').expect(401);
		});

		test('should NOT be able to access POST /sso/saml/config', async () => {
			await testServer.authlessAgent.post('/sso/saml/config').expect(401);
		});

		test('should NOT be able to access POST /sso/saml/config/toggle', async () => {
			await testServer.authlessAgent.post('/sso/saml/config/toggle').expect(401);
		});

		test('should be able to access GET /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await testServer.authlessAgent.get('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access POST /sso/saml/acs', async () => {
			// Note that 401 here is coming from the missing SAML object,
			// not from not being able to access the endpoint, so this is expected!
			const response = await testServer.authlessAgent.post('/sso/saml/acs').expect(401);
			expect(response.text).toContain('SAML Authentication failed');
		});

		test('should be able to access GET /sso/saml/initsso', async () => {
			await testServer.authlessAgent.get('/sso/saml/initsso').expect(200);
		});

		test('should NOT be able to access POST /sso/saml/config/test', async () => {
			await testServer.authlessAgent.post('/sso/saml/config/test').expect(401);
		});
	});
});

describe('POST /sso/saml/config/test round-trip', () => {
	beforeAll(() => {
		// ACS renders handlebars templates; configure the engine on the test app.
		testServer.app.engine('handlebars', createHandlebarsEngine());
		testServer.app.set('view engine', 'handlebars');
		testServer.app.set('views', TEMPLATES_DIR);
	});

	beforeEach(async () => {
		await enableSaml(false);
		await Container.get(SamlService).reset();
	});

	test('embeds a test token in the RelayState when metadata is provided without saving', async () => {
		const response = await authOwnerAgent
			.post('/sso/saml/config/test')
			.send({ metadata: sampleConfig.metadata, loginBinding: 'redirect' })
			.expect(200);

		// Body is the IdP redirect URL; its RelayState query param must point at the
		// test return URL and include our opaque test token.
		const redirectUrl = new URL(response.body.data as string);
		const relayState = redirectUrl.searchParams.get('RelayState');
		expect(relayState).toBeTruthy();

		const relayStateUrl = new URL(relayState!);
		expect(relayStateUrl.pathname).toBe('/config/test/return');
		expect(relayStateUrl.searchParams.get('t')).toMatch(/^[0-9a-f]+$/);
	});

	test('ACS callback with the test token does not fail with "No IdP metadata configured"', async () => {
		// Prime the test config without persisting SAML preferences.
		const initResponse = await authOwnerAgent
			.post('/sso/saml/config/test')
			.send({ metadata: sampleConfig.metadata, loginBinding: 'redirect' })
			.expect(200);
		const relayState = new URL(initResponse.body.data as string).searchParams.get('RelayState')!;

		const acsResponse = await testServer.authlessAgent
			.post('/sso/saml/acs')
			.type('form')
			.send({ RelayState: relayState, SAMLResponse: 'invalid' })
			.expect(200);

		// The rendered failure template proves we handled this as a test-connection
		// flow (not a login auth error). The distinctive pre-fix error message
		// must not appear — cached metadata should have been consumed.
		expect(acsResponse.text).toContain('SAML Connection Test failed');
		expect(acsResponse.text).not.toContain('No IdP metadata configured');
	});

	test('ACS callback consumes the test token so a later lookup returns undefined', async () => {
		const initResponse = await authOwnerAgent
			.post('/sso/saml/config/test')
			.send({ metadata: sampleConfig.metadata, loginBinding: 'redirect' })
			.expect(200);
		const relayState = new URL(initResponse.body.data as string).searchParams.get('RelayState')!;
		const testId = new URL(relayState).searchParams.get('t')!;

		await testServer.authlessAgent
			.post('/sso/saml/acs')
			.type('form')
			.send({ RelayState: relayState, SAMLResponse: 'invalid' })
			.expect(200);

		// After the ACS callback, the cached metadata must be gone — confirming
		// the token is single-use.
		const consumed = await Container.get(SamlService).consumePendingTestConfig(testId);
		expect(consumed).toBeUndefined();
	});
});

describe('Signing key configuration via API', () => {
	const originalEnv = process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS;

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = originalEnv;
		} else {
			delete process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS;
		}
	});

	describe('POST /sso/saml/config with signing keys', () => {
		test('should reject signing keys when feature flag is disabled', async () => {
			delete process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS;

			const response = await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(400);

			expect(response.body.message).toContain('SAML request signing is not enabled');
		});

		test('should accept valid RSA signing key pair', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);
		});

		test('should accept valid EC signing key pair', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: EC_TEST_PRIVATE_KEY,
					signingCertificate: EC_TEST_CERTIFICATE,
				})
				.expect(200);
		});

		test('should reject mismatched key and certificate', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			const response = await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					authnRequestsSigned: true,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_MISMATCHED_CERTIFICATE,
				})
				.expect(400);

			expect(response.body.message).toContain('do not match');
		});

		test('should reject invalid PEM private key format', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			const response = await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: 'not-a-valid-pem-key',
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(400);

			expect(response.body.message).toContain('Invalid signing private key format');
		});

		test('should reject invalid PEM certificate format', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			const response = await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: 'not-a-valid-pem-cert',
				})
				.expect(400);

			expect(response.body.message).toContain('Invalid signing certificate format');
		});

		test('should require both key and cert when authnRequestsSigned is true', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			// Clear any signing keys stored from prior tests
			const samlService = Container.get(SamlService);
			type PrivatePrefs = { _samlPreferences: SamlPreferences };
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingPrivateKey = undefined;
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingCertificate = undefined;

			const response = await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					authnRequestsSigned: true,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
				})
				.expect(400);

			expect(response.body.message).toContain(
				'Both signingPrivateKey and signingCertificate are required',
			);
		});
	});

	describe('GET /sso/saml/config after setting signing keys', () => {
		test('should return redacted private key and plaintext certificate after POST', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			// POST the config with signing keys
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);

			// GET the config back (response is wrapped in { data: ... })
			const response = await authOwnerAgent.get('/sso/saml/config').expect(200);
			const config = response.body.data;

			// Private key should be redacted with the blanking value, never plaintext
			expect(config.signingPrivateKey).toBe(CREDENTIAL_BLANKING_VALUE);

			// Certificate should be returned in plaintext (it's public data)
			expect(config.signingCertificate).toBe(RSA_TEST_CERTIFICATE);
		});

		test('should return redacted EC private key and plaintext certificate after POST', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: EC_TEST_PRIVATE_KEY,
					signingCertificate: EC_TEST_CERTIFICATE,
				})
				.expect(200);

			const response = await authOwnerAgent.get('/sso/saml/config').expect(200);
			const config = response.body.data;

			expect(config.signingPrivateKey).toBe(CREDENTIAL_BLANKING_VALUE);
			expect(config.signingCertificate).toBe(EC_TEST_CERTIFICATE);
		});

		test('should not return signing fields when none were set', async () => {
			// Clear any previously stored signing keys from prior tests
			const samlService = Container.get(SamlService);
			type PrivatePrefs = { _samlPreferences: SamlPreferences };
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingPrivateKey = undefined;
			(samlService as unknown as PrivatePrefs)._samlPreferences.signingCertificate = undefined;

			// POST config without signing keys
			await authOwnerAgent.post('/sso/saml/config').send(sampleConfig).expect(200);

			const response = await authOwnerAgent.get('/sso/saml/config').expect(200);
			const config = response.body.data;

			// Fields should not be present (JSON.stringify drops undefined values)
			expect(config.signingPrivateKey).toBeUndefined();
			expect(config.signingCertificate).toBeUndefined();
		});
	});

	describe('POST + GET round-trip preserves decryptability', () => {
		test('should allow service to decrypt RSA key after API round-trip', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);

			const samlService = Container.get(SamlService);
			// @ts-expect-error -- accessing private method for testing
			const decryptedKey = samlService.getDecryptedSigningPrivateKey();
			expect(decryptedKey).toBe(RSA_TEST_PRIVATE_KEY);
		});

		test('should allow service to decrypt EC key after API round-trip', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: EC_TEST_PRIVATE_KEY,
					signingCertificate: EC_TEST_CERTIFICATE,
				})
				.expect(200);

			const samlService = Container.get(SamlService);
			// @ts-expect-error -- accessing private method for testing
			const decryptedKey = samlService.getDecryptedSigningPrivateKey();
			expect(decryptedKey).toBe(EC_TEST_PRIVATE_KEY);
		});

		test('should clear signing key when empty string is sent via POST', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			// POST with real key
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);

			// Verify key is stored
			const samlService = Container.get(SamlService);
			// @ts-expect-error -- accessing private method for testing
			expect(samlService.getDecryptedSigningPrivateKey()).toBe(RSA_TEST_PRIVATE_KEY);

			// Clear both fields
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: '',
					signingCertificate: '',
				})
				.expect(200);

			// Key should be cleared
			// @ts-expect-error -- accessing private method for testing
			expect(samlService.getDecryptedSigningPrivateKey()).toBeUndefined();
			expect(samlService.samlPreferences.signingCertificate).toBeUndefined();

			// GET should not return signing fields
			const response = await authOwnerAgent.get('/sso/saml/config').expect(200);
			expect(response.body.data.signingPrivateKey).toBeUndefined();
			expect(response.body.data.signingCertificate).toBeUndefined();
		});

		test('should preserve existing key when POST sends back blanking value', async () => {
			process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS = 'true';

			// POST with real key
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: RSA_TEST_PRIVATE_KEY,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);

			// Simulate UI round-trip: GET returns blanking value, UI sends it back in POST
			await authOwnerAgent
				.post('/sso/saml/config')
				.send({
					...sampleConfig,
					signingPrivateKey: CREDENTIAL_BLANKING_VALUE,
					signingCertificate: RSA_TEST_CERTIFICATE,
				})
				.expect(200);

			// Key should still be decryptable to original value
			const samlService = Container.get(SamlService);
			// @ts-expect-error -- accessing private method for testing
			const decryptedKey = samlService.getDecryptedSigningPrivateKey();
			expect(decryptedKey).toBe(RSA_TEST_PRIVATE_KEY);
		});
	});
});

describe('SAML email validation', () => {
	let samlService: SamlService;

	beforeAll(async () => {
		samlService = Container.get(SamlService);
	});

	describe('handleSamlLogin', () => {
		test('should throw BadRequestError for invalid email format', async () => {
			// Mock getAttributesFromLoginResponse to return invalid email
			jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
				mapped: {
					email: 'invalid-email-format',
					firstName: 'John',
					lastName: 'Doe',
					userPrincipalName: 'john.doe',
					n8nInstanceRole: 'n8n_instance_role',
				},
				raw: {},
			});

			const mockRequest = {} as express.Request;

			await expect(samlService.handleSamlLogin(mockRequest, 'post')).rejects.toThrow(
				new BadRequestError('Invalid email format'),
			);
		});

		test.each([['not-an-email'], ['@missinglocal.com'], ['missing@.com'], ['spaces in@email.com']])(
			'should throw BadRequestError for invalid email <%s>',
			async (invalidEmail) => {
				jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
					mapped: {
						email: invalidEmail,
						firstName: 'John',
						lastName: 'Doe',
						userPrincipalName: 'john.doe',
						n8nInstanceRole: 'n8n_instance_role',
					},
					raw: {},
				});

				const mockRequest = {} as express.Request;

				await expect(samlService.handleSamlLogin(mockRequest, 'post')).rejects.toThrow(
					new BadRequestError('Invalid email format'),
				);
			},
		);

		test.each([
			['user@example.com'],
			['test.email@domain.org'],
			['user+tag@example.com'],
			['user123@test-domain.com'],
		])('should handle valid email <%s> successfully', async (validEmail) => {
			const mockRequest = {} as express.Request;

			jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
				mapped: {
					email: validEmail,
					firstName: 'John',
					lastName: 'Doe',
					userPrincipalName: 'john.doe',
					n8nInstanceRole: 'n8n_instance_role',
				},
				raw: {},
			});

			// Should not throw an error for valid emails
			const result = await samlService.handleSamlLogin(mockRequest, 'post');
			expect(result).toBeDefined();
			expect(result.attributes.email).toBe(validEmail);
		});

		test('should convert email to lowercase before validation', async () => {
			const upperCaseEmail = 'USER@EXAMPLE.COM';

			jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
				mapped: {
					email: upperCaseEmail,
					firstName: 'John',
					lastName: 'Doe',
					userPrincipalName: 'john.doe',
					n8nInstanceRole: 'n8n_instance_role',
				},
				raw: {},
			});

			const mockRequest = {} as express.Request;

			// Should not throw an error as the email is valid when converted to lowercase
			const result = await samlService.handleSamlLogin(mockRequest, 'post');
			expect(result).toBeDefined();
			expect(result.attributes.email).toBe(upperCaseEmail); // Original email should be preserved in attributes
		});
	});
});

describe('SAML SSO provisioning', () => {
	let samlService: SamlService;
	let roleMappingRuleRepository: RoleMappingRuleRepository;
	let roleRepository: RoleRepository;
	let userRepository: UserRepository;
	let originalEnvFlag: string | undefined;
	let savedProvisioningConfig: unknown;

	beforeAll(async () => {
		samlService = Container.get(SamlService);
		roleMappingRuleRepository = Container.get(RoleMappingRuleRepository);
		roleRepository = Container.get(RoleRepository);
		userRepository = Container.get(UserRepository);
		await Container.get(ProvisioningService).init();
	});

	beforeEach(() => {
		originalEnvFlag = process.env.N8N_ENV_FEAT_EXPRESSION_ROLE_MAPPING;
		process.env.N8N_ENV_FEAT_EXPRESSION_ROLE_MAPPING = 'true';

		const provisioningService = Container.get(ProvisioningService);
		// @ts-expect-error - provisioningConfig is private
		savedProvisioningConfig = { ...provisioningService.provisioningConfig };
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig.scopesUseExpressionMapping = true;
	});

	afterEach(async () => {
		if (originalEnvFlag === undefined) {
			delete process.env.N8N_ENV_FEAT_EXPRESSION_ROLE_MAPPING;
		} else {
			process.env.N8N_ENV_FEAT_EXPRESSION_ROLE_MAPPING = originalEnvFlag;
		}

		const provisioningService = Container.get(ProvisioningService);
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig = { ...savedProvisioningConfig };

		await roleMappingRuleRepository.delete({});
	});

	it('should provision instance role via expression mapping', async () => {
		const adminRole = await roleRepository.findOneOrFail({ where: { slug: 'global:admin' } });
		await roleMappingRuleRepository.save(
			roleMappingRuleRepository.create({
				expression: "{{ $claims.department === 'it' }}",
				role: adminRole,
				type: 'instance',
				order: 0,
			}),
		);

		jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
			mapped: {
				email: 'saml-expr-instance@example.com',
				firstName: 'SAML',
				lastName: 'User',
				userPrincipalName: 'saml-expr-instance',
			},
			raw: { department: 'it', email: 'saml-expr-instance@example.com' },
		});

		const mockRequest = {} as express.Request;
		const result = await samlService.handleSamlLogin(mockRequest, 'post');
		expect(result).toBeDefined();

		const userFromDB = await userRepository.findOne({
			where: { email: 'saml-expr-instance@example.com' },
			relations: ['role'],
		});
		expect(userFromDB!.role.slug).toEqual('global:admin');
	});

	it('should provision project role via expression mapping', async () => {
		const project = await createTeamProject('saml-expr-project-role-test');

		const editorRole = await roleRepository.findOneOrFail({ where: { slug: 'project:editor' } });
		const rule = roleMappingRuleRepository.create({
			expression: "{{ $claims.groups !== undefined && $claims.groups.includes('n8n-editors') }}",
			role: editorRole,
			type: 'project',
			order: 0,
		});
		rule.projects = [project];
		await roleMappingRuleRepository.save(rule);

		jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
			mapped: {
				email: 'saml-expr-project@example.com',
				firstName: 'SAML',
				lastName: 'User',
				userPrincipalName: 'saml-expr-project',
			},
			raw: {
				email: 'saml-expr-project@example.com',
				groups: ['n8n-editors', 'devops'],
			},
		});

		const mockRequest = {} as express.Request;
		const result = await samlService.handleSamlLogin(mockRequest, 'post');
		expect(result.authenticatedUser).toBeDefined();

		const projectRole = await getProjectRoleForUser(project.id, result.authenticatedUser!.id);
		expect(projectRole).toEqual('project:editor');
	});
});
