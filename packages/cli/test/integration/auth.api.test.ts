import type { SuperAgentTest } from 'supertest';
import { Container } from 'typedi';
import { License } from '@/License';
import validator from 'validator';
import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { Role } from '@db/entities/Role';
import type { User } from '@db/entities/User';
import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { getGlobalMemberRole, getGlobalOwnerRole } from './shared/db/roles';
import { createUser, createUserShell } from './shared/db/users';
import { UserRepository } from '@db/repositories/user.repository';

let globalOwnerRole: Role;
let globalMemberRole: Role;
let owner: User;
let authOwnerAgent: SuperAgentTest;
const ownerPassword = randomValidPassword();

const testServer = utils.setupTestServer({ endpointGroups: ['auth'] });

beforeAll(async () => {
	globalOwnerRole = await getGlobalOwnerRole();
	globalMemberRole = await getGlobalMemberRole();
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
			globalRole: globalOwnerRole,
		});
	});

	test('should log user in', async () => {
		const response = await testServer.authlessAgent.post('/login').send({
			email: owner.email,
			password: ownerPassword,
		});

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, password, personalizationAnswers, globalRole, apiKey } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(globalRole).toBeDefined();
		expect(globalRole.name).toBe('owner');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});

	test('should throw AuthError for non-owner if not within users limit quota', async () => {
		jest.spyOn(Container.get(License), 'isWithinUsersLimit').mockReturnValueOnce(false);
		const password = 'testpassword';
		const member = await createUser({
			password,
		});

		const response = await testServer.authlessAgent.post('/login').send({
			email: member.email,
			password,
		});
		expect(response.statusCode).toBe(403);
	});

	test('should not throw AuthError for owner if not within users limit quota', async () => {
		jest.spyOn(Container.get(License), 'isWithinUsersLimit').mockReturnValueOnce(false);
		const ownerUser = await createUser({
			password: randomValidPassword(),
			globalRole: globalOwnerRole,
			isOwner: true,
		});

		const response = await testServer.authAgentFor(ownerUser).get('/login');
		expect(response.statusCode).toBe(200);
	});
});

describe('GET /login', () => {
	test('should return 401 Unauthorized if no cookie', async () => {
		const response = await testServer.authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return cookie if UM is disabled and no cookie is already set', async () => {
		await createUserShell(globalOwnerRole);
		await utils.setInstanceOwnerSetUp(false);

		const response = await testServer.authlessAgent.get('/login');

		expect(response.statusCode).toBe(200);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});

	test('should return 401 Unauthorized if invalid cookie', async () => {
		testServer.authlessAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

		const response = await testServer.authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner shell', async () => {
		const ownerShell = await createUserShell(globalOwnerRole);

		const response = await testServer.authAgentFor(ownerShell).get('/login');

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, password, personalizationAnswers, globalRole, apiKey } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(globalRole).toBeDefined();
		expect(globalRole.name).toBe('owner');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member shell', async () => {
		const memberShell = await createUserShell(globalMemberRole);

		const response = await testServer.authAgentFor(memberShell).get('/login');

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, password, personalizationAnswers, globalRole, apiKey } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(globalRole).toBeDefined();
		expect(globalRole.name).toBe('member');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner', async () => {
		const owner = await createUser({ globalRole: globalOwnerRole });

		const response = await testServer.authAgentFor(owner).get('/login');

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, password, personalizationAnswers, globalRole, apiKey } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(globalRole).toBeDefined();
		expect(globalRole.name).toBe('owner');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member', async () => {
		const member = await createUser({ globalRole: globalMemberRole });

		const response = await testServer.authAgentFor(member).get('/login');

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, password, personalizationAnswers, globalRole, apiKey } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(member.email);
		expect(firstName).toBe(member.firstName);
		expect(lastName).toBe(member.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(globalRole).toBeDefined();
		expect(globalRole.name).toBe('member');
		expect(globalRole.scope).toBe('global');
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});

describe('GET /resolve-signup-token', () => {
	beforeEach(async () => {
		owner = await createUser({
			password: ownerPassword,
			globalRole: globalOwnerRole,
		});
		authOwnerAgent = testServer.authAgentFor(owner);
	});

	test('should validate invite token', async () => {
		const memberShell = await createUserShell(globalMemberRole);

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
		jest.spyOn(Container.get(License), 'isWithinUsersLimit').mockReturnValueOnce(false);
		const memberShell = await createUserShell(globalMemberRole);

		const response = await authOwnerAgent
			.get('/resolve-signup-token')
			.query({ inviterId: owner.id })
			.query({ inviteeId: memberShell.id });

		expect(response.statusCode).toBe(403);
	});

	test('should fail with invalid inputs', async () => {
		const { id: inviteeId } = await createUser({ globalRole: globalMemberRole });

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
		await Container.get(UserRepository).update(owner.id, { email: '' });
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
		const owner = await createUser({ globalRole: globalOwnerRole });

		const response = await testServer.authAgentFor(owner).post('/logout');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});
