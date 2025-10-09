import { randomEmail, randomName, randomValidPassword } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { setSamlLoginEnabled } from '@/sso.ee/saml/saml-helpers';
import { SamlService } from '@/sso.ee/saml/saml.service.ee';
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

describe('SAML email validation', () => {
	let samlService: SamlService;

	beforeAll(async () => {
		samlService = Container.get(SamlService);
	});

	describe('handleSamlLogin', () => {
		test('should throw BadRequestError for invalid email format', async () => {
			// Mock getAttributesFromLoginResponse to return invalid email
			jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
				email: 'invalid-email-format',
				firstName: 'John',
				lastName: 'Doe',
				userPrincipalName: 'john.doe',
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
					email: invalidEmail,
					firstName: 'John',
					lastName: 'Doe',
					userPrincipalName: 'john.doe',
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
				email: validEmail,
				firstName: 'John',
				lastName: 'Doe',
				userPrincipalName: 'john.doe',
			});

			// Should not throw an error for valid emails
			const result = await samlService.handleSamlLogin(mockRequest, 'post');
			expect(result).toBeDefined();
			expect(result.attributes.email).toBe(validEmail);
		});

		test('should convert email to lowercase before validation', async () => {
			const upperCaseEmail = 'USER@EXAMPLE.COM';

			jest.spyOn(samlService, 'getAttributesFromLoginResponse').mockResolvedValue({
				email: upperCaseEmail,
				firstName: 'John',
				lastName: 'Doe',
				userPrincipalName: 'john.doe',
			});

			const mockRequest = {} as express.Request;

			// Should not throw an error as the email is valid when converted to lowercase
			const result = await samlService.handleSamlLogin(mockRequest, 'post');
			expect(result).toBeDefined();
			expect(result.attributes.email).toBe(upperCaseEmail); // Original email should be preserved in attributes
		});
	});
});
