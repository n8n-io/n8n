import type { Application } from 'express';
import type { SuperAgentTest } from 'supertest';
import validator from 'validator';
import config from '@/config';
import * as Db from '@/Db';
import { AUTH_COOKIE_NAME, ROLES } from '@/constants';
import type { User } from '@db/entities/User';
import { LOGGED_OUT_RESPONSE_BODY } from './shared/constants';
import { randomValidPassword } from './shared/random';
import * as testDb from './shared/testDb';
import type { AuthAgent } from './shared/types';
import * as utils from './shared/utils';

let app: Application;
let owner: User;
let authAgent: AuthAgent;
let authlessAgent: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;
const ownerPassword = randomValidPassword();

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['auth'] });
	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	authlessAgent = utils.createAgent(app);
	config.set('ldap.disabled', true);
	await utils.setInstanceOwnerSetUp(true);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('POST /login', () => {
	beforeEach(async () => {
		owner = await testDb.createUser({
			password: ownerPassword,
			role: ROLES.GLOBAL_OWNER,
		});
	});

	test('should log user in', async () => {
		const response = await authlessAgent.post('/login').send({
			email: owner.email,
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
			resetPasswordToken,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(role).toBe(ROLES.GLOBAL_OWNER);
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});
});

describe('GET /login', () => {
	test('should return 401 Unauthorized if no cookie', async () => {
		const response = await authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return cookie if UM is disabled and no cookie is already set', async () => {
		await testDb.createUserShell(ROLES.GLOBAL_OWNER);
		await utils.setInstanceOwnerSetUp(false);

		const response = await authlessAgent.get('/login');

		expect(response.statusCode).toBe(200);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeDefined();
	});

	test('should return 401 Unauthorized if invalid cookie', async () => {
		authlessAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

		const response = await authlessAgent.get('/login');

		expect(response.statusCode).toBe(401);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner shell', async () => {
		const ownerShell = await testDb.createUserShell(ROLES.GLOBAL_OWNER);

		const response = await authAgent(ownerShell).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			resetPasswordToken,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(role).toBe(ROLES.GLOBAL_OWNER);
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member shell', async () => {
		const memberShell = await testDb.createUserShell(ROLES.GLOBAL_MEMBER);

		const response = await authAgent(memberShell).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			resetPasswordToken,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBeDefined();
		expect(firstName).toBeNull();
		expect(lastName).toBeNull();
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(role).toBe(ROLES.GLOBAL_MEMBER);
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in owner', async () => {
		const owner = await testDb.createUser({ role: ROLES.GLOBAL_OWNER });

		const response = await authAgent(owner).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			resetPasswordToken,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(owner.email);
		expect(firstName).toBe(owner.firstName);
		expect(lastName).toBe(owner.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(role).toBe(ROLES.GLOBAL_OWNER);
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});

	test('should return logged-in member', async () => {
		const member = await testDb.createUser({ role: ROLES.GLOBAL_MEMBER });

		const response = await authAgent(member).get('/login');

		expect(response.statusCode).toBe(200);

		const {
			id,
			email,
			firstName,
			lastName,
			password,
			personalizationAnswers,
			role,
			resetPasswordToken,
			apiKey,
		} = response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe(member.email);
		expect(firstName).toBe(member.firstName);
		expect(lastName).toBe(member.lastName);
		expect(password).toBeUndefined();
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(resetPasswordToken).toBeUndefined();
		expect(role).toBe(ROLES.GLOBAL_MEMBER);
		expect(apiKey).toBeUndefined();

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});

describe('GET /resolve-signup-token', () => {
	beforeEach(async () => {
		owner = await testDb.createUser({
			password: ownerPassword,
			role: ROLES.GLOBAL_OWNER,
		});
		authOwnerAgent = authAgent(owner);
	});

	test('should validate invite token', async () => {
		const memberShell = await testDb.createUserShell(ROLES.GLOBAL_MEMBER);

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

	test('should fail with invalid inputs', async () => {
		const { id: inviteeId } = await testDb.createUser({ role: ROLES.GLOBAL_MEMBER });

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
		await Db.collections.User.update(owner.id, { email: '' });
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
		const owner = await testDb.createUser({ role: ROLES.GLOBAL_OWNER });

		const response = await authAgent(owner).post('/logout');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(LOGGED_OUT_RESPONSE_BODY);

		const authToken = utils.getAuthToken(response);
		expect(authToken).toBeUndefined();
	});
});
