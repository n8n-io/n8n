import { randomValidPassword, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import validator from 'validator';

import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { MfaService } from '@/mfa/mfa.service';
import { JwtService } from '@/services/jwt.service';

import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { createUser, createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

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
		const token = Container.get(JwtService).sign(
			{ inviterId: owner.id, inviteeId: memberShell.id },
			{ expiresIn: '90d' },
		);

		const response = await authOwnerAgent.get('/resolve-signup-token').query({ token });

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
		const token = Container.get(JwtService).sign(
			{ inviterId: owner.id, inviteeId: memberShell.id },
			{ expiresIn: '90d' },
		);

		const response = await authOwnerAgent.get('/resolve-signup-token').query({ token });

		expect(response.statusCode).toBe(403);
	});

	test('should fail with invalid inputs', async () => {
		const { id: inviteeId } = await createUser({ role: { slug: 'global:member' } });
		const validToken = Container.get(JwtService).sign(
			{ inviterId: owner.id, inviteeId },
			{ expiresIn: '90d' },
		);

		const first = await authOwnerAgent.get('/resolve-signup-token').query({});

		const second = await authOwnerAgent.get('/resolve-signup-token').query({ token: '' });

		const third = await authOwnerAgent.get('/resolve-signup-token').query({
			token: 'invalid-jwt-token',
		});

		// user is already set up, so call should error
		const fourth = await authOwnerAgent.get('/resolve-signup-token').query({ token: validToken });

		// cause inconsistent DB state
		owner.email = '';
		await Container.get(UserRepository).save(owner, { listeners: false });
		const fifth = await authOwnerAgent.get('/resolve-signup-token').query({ token: validToken });

		for (const response of [first, second, third, fourth, fifth]) {
			expect(response.statusCode).toBe(400);
		}
	});

	test('should send roles for user-invite-email-click event', async () => {
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);
		const token = Container.get(JwtService).sign(
			{ inviterId: owner.id, inviteeId: memberShell.id },
			{ expiresIn: '90d' },
		);

		const eventService = Container.get(EventService);
		const emitSpy = jest.spyOn(eventService, 'emit');

		await authOwnerAgent.get('/resolve-signup-token').query({ token }).expect(200);

		// Check all emitted events
		let foundEvent = false;
		for (const [eventName, payload] of emitSpy.mock.calls) {
			if (eventName === 'user-invite-email-click') {
				foundEvent = true;
				expect(payload).toBeDefined();
				const { invitee, inviter } = payload as RelayEventMap['user-invite-email-click'];
				expect(invitee.role).toBeDefined();
				expect(invitee.role?.slug).toBe('global:member');
				expect(inviter.role).toBeDefined();
				expect(inviter.role?.slug).toBe('global:owner');
			}
		}

		expect(foundEvent).toBe(true);
		emitSpy.mockRestore();
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
