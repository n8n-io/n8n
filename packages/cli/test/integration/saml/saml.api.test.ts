import { randomEmail, randomName, randomValidPassword } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { setSamlLoginEnabled } from '@/sso.ee/saml/saml-helpers';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

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
					email: randomEmail(),
					firstName: randomName(),
					lastName: randomName(),
					password: randomValidPassword(),
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

		test('should be able to access GET /sso/saml/config/test', async () => {
			await authOwnerAgent.get('/sso/saml/config/test').expect(200);
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

		test('should NOT be able to access GET /sso/saml/config/test', async () => {
			await authMemberAgent.get('/sso/saml/config/test').expect(403);
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

		test('should NOT be able to access GET /sso/saml/config/test', async () => {
			await testServer.authlessAgent.get('/sso/saml/config/test').expect(401);
		});
	});
});
