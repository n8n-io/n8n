import { randomValidPassword, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import validator from 'validator';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { MfaService } from '@/mfa/mfa.service';

import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { createUser, createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;
const ownerPassword = randomValidPassword();

const testServer = utils.setupTestServer({ endpointGroups: ['auth'] });
const license = testServer.license;

let mfaService: MfaService;

beforeAll(async () => {
	mfaService = Container.get(MfaService);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	config.set('ldap.disabled', true);
	await utils.setInstanceOwnerSetUp(true);
});

describe('POST /login', () => {
	beforeEach(async () => {
		owner = await createUser({
			password: ownerPassword,
			role: GLOBAL_OWNER_ROLE,
		});
	});

	test('should log user in', async () => {
		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: owner.email,
			password: ownerPassword,
		});

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
			mfaSecret,
			mfaRecoveryCodes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(mfaRecoveryCodes).toBeUndefined();
		expect(mfaSecret).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});

	test('should log user with MFA enabled', async () => {
		const secret = 'test';
		const recoveryCodes = ['1'];
		await mfaService.saveSecretAndRecoveryCodes(owner.id, secret, recoveryCodes);
		await mfaService.enableMfa(owner.id);

		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: owner.email,
			password: ownerPassword,
			mfaCode: mfaService.totp.generateTOTP(secret),
		});

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			mfaRecoveryCodes,
			mfaSecret,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(mfaRecoveryCodes).toBeUndefined();
		expect(mfaSecret).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});

	test('should throw AuthError for non-owner if not within users limit quota', async () => {
		license.setQuota('quota:users', 0);
		const password = 'testpassword';
		const member = await createUser({
			password,
		});

		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: member.email,
			password,
		});
		expect(response.statusCode).toBe(403);
	});

	test('should not throw AuthError for owner if not within users limit quota', async () => {
		license.setQuota('quota:users', 0);
		const ownerUser = await createUser({
			password: randomValidPassword(),
			role: GLOBAL_OWNER_ROLE,
		});

		const response = await testServer.authAgentFor(ownerUser).get('/login');
		expect(response.statusCode).toBe(200);
	});

	test('should fail with invalid email in the payload is the current authentication method is "email"', async () => {
		config.set('userManagement.authenticationMethod', 'email');

		const response = await testServer.authlessAgent.post('/login').send({
			emailOrLdapLoginId: 'invalid-email',
			password: ownerPassword,
		});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Invalid email address');
	});
});

describe('GET /login', () => {
	test('should return 401 Unauthorized if no cookie', async () => {
		const response = await testServer.authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return 401 Unauthorized if invalid cookie', async () => {
		testServer.authlessAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

		const response = await testServer.authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner shell', async () => {
		const ownerShell = await createUserShell(GLOBAL_OWNER_ROLE);

		const response = await testServer.authAgentFor(ownerShell).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).toContain('workflow:read');

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member shell', async () => {
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);

		const response = await testServer.authAgentFor(memberShell).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:member');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toContain('workflow:read');

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });

		const response = await testServer.authAgentFor(owner).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).toContain('workflow:read');

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member', async () => {
		const member = await createUser({ role: { slug: 'global:member' } });

		const response = await testServer.authAgentFor(member).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			apiKey,
			globalScopes,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(member.email);
		expect(firstName).toBe(member.firstName);
		expect(lastName).toBe(member.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(role).toBe('global:member');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).toBeDefined();
		expect(globalScopes).not.toContain('workflow:read');

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});

describe('GET /resolve-signup-token', () => {
	beforeEach(async () => {
		owner = await createUser({
			password: ownerPassword,
			role: GLOBAL_OWNER_ROLE,
		});
		authOwnerAgent = testServer.authAgentFor(owner);
	});

	test('should validate invite token', async () => {
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);

		const response = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId: memberShell.id });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({
			data: {
				inviter: {
					firstName: owner.firstName,
					lastName: owner.lastName,
				},
			},
		});
	});

	test('should return 403 if user quota reached', async () => {
		license.setQuota('quota:users', 0);
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);

		const response = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId: memberShell.id });

		expect(response.statusCode).toBe(403);
	});

	test('should fail with invalid inputs', async () => {
		const { id: inviteeId } = await createUser({ role: { slug: 'global:member' } });

		const first = await authOwnerAgent.get('/resolve-signup-token').query({ inviterId: owner.id });

		const second = await authOwnerAgent.get('/resolve-signup-token').query({ inviteeId });

		const third = await authOwnerAgent.get('/resolve-signup-token').query({
			inviterId: '5531199e-b7ae-425b-a326-a95ef8cca59d',
			inviteeId: 'cb133beb-7729-4c34-8cd1-a06be8834d9d',
		});

		// user is already set up, so call should error
		const fourth = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId });

		// cause inconsistent DB state
		owner.email = '';
		await Container.get(UserRepository).save(owner, { listeners: false });
		const fifth = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId });

		for (const response of [first, second, third, fourth, fifth]) {
			expect(response.statusCode).toBe(400);
		}
	});
});

describe('POST /logout', () => {
	test('should log user out', async () => {
		const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		const ownerAgent = testServer.authAgentFor(owner);
		// @ts-expect-error `accessInfo` types are incorrect
		const cookie = ownerAgent.jar.getCookie(AUTH_COOKIE_NAME, { path: '/' });

		const response = await ownerAgent.post('/logout');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();

		ownerAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=${cookie!.value}`);
		await ownerAgent.get('/login').expect(401);
	});
});
