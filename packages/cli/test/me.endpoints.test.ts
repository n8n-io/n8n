import express = require('express');
import * as request from 'supertest';
import { getConnection } from 'typeorm';
import validator from 'validator';

import config = require('../config');
import { Db } from '../src';
import * as utils from './shared/utils';
import { meNamespace } from '../src/UserManagement/routes/me';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { usersNamespace } from '../src/UserManagement/routes/users';

describe('/me endpoints', () => {
	describe('Shell requests', () => {
		let testServer: { app: express.Application; restEndpoint: string };
		let shell: request.SuperAgentTest;

		beforeAll(async () => {
			testServer = utils.initTestServer();
			meNamespace.apply(testServer);

			await Db.init();
			await getConnection().runMigrations({ transaction: 'none' });

			shell = request.agent(testServer.app);
			shell.use(utils.restPrefix);

			await shell.get('/login');
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized shell', async () => {
			const response = await shell.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBeNull();
			expect(firstName).toBe('default');
			expect(lastName).toBe('default');
			expect(personalizationAnswers).toBeNull();

			utils.expectOwnerGlobalRole(globalRole);
		});

		test('PATCH /me should return succeed with valid inputs', () => {
			return validRequests.patchMe(shell, 'shell');
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(shell);
		});

		test('PATCH /me/password should succeed with valid inputs', () => {
			return validRequests.patchPassword(shell);
		});

		test('PATCH /me/password should fail with invalid inputs', () => {
			return invalidRequests.patchPassword(shell);
		});

		test('POST /me/survey should succeed with valid inputs', () => {
			return validRequests.postSurvey(shell);
		});
	});

	describe('Owner requests', () => {
		let testServer: { app: express.Application; restEndpoint: string };
		let owner: request.SuperAgentTest;

		beforeAll(async () => {
			testServer = utils.initTestServer();
			meNamespace.apply(testServer);

			await Db.init();
			await getConnection().runMigrations({ transaction: 'none' });

			owner = request.agent(testServer.app);
			owner.use(utils.restPrefix);

			await owner.get('/login');

			await owner.post('/owner-setup').send({
				email: 'owner@n8n.io',
				firstName: 'John',
				lastName: 'Smith',
				password: 'abcd1234',
			});
		});

		afterAll(async () => {
			await getConnection().close();
		});

		test('GET /me should return sanitized owner', async () => {
			const response = await owner.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe('owner@n8n.io');
			expect(firstName).toBe('John');
			expect(lastName).toBe('Smith');
			expect(personalizationAnswers).toBeNull();

			utils.expectOwnerGlobalRole(globalRole);
		});

		test('PATCH /me should succeed with valid inputs', () => {
			return validRequests.patchMe(owner, 'owner');
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(owner);
		});

		test('PATCH /me/password should succeed with valid inputs', () => {
			return validRequests.patchPassword(owner);
		});

		test('PATCH /me/password should fail with invalid inputs', () => {
			return invalidRequests.patchPassword(owner);
		});

		test('POST /me/survey should succeed with valid inputs', () => {
			return validRequests.postSurvey(owner);
		});
	});

	describe('Member requests', () => {
		let testServer: { app: express.Application; restEndpoint: string };
		let owner: request.SuperAgentTest;
		let member: request.SuperAgentTest;

		beforeAll(async () => {
			testServer = utils.initTestServer();
			meNamespace.apply(testServer);
			usersNamespace.apply(testServer);
			config.set('userManagement.emails.mode', 'smtp'); // needed for POST /users

			await Db.init();
			await getConnection().runMigrations({ transaction: 'none' });

			owner = request.agent(testServer.app);
			owner.use(utils.restPrefix);

			// 1. use SQL **instead** of exercising the routes
			// helper to insert random 'member' user

			// 2. move user creation to test

			// 3. TRUNCATE user tables on afterEach (clean DB)

			// 4. Figure out connection error: ConnectionIsNotSetError: Connection with sqlite database is not established. Check connection configuration.

			await owner.get('/login');

			const {
				body: {
					data: { id: ownerId },
				},
			} = await owner.post('/owner-setup').send({
				email: 'owner@n8n.io',
				firstName: 'John',
				lastName: 'Smith',
				password: 'abcd1234',
			});

			const {
				body: { data },
			} = await owner.post('/users').send([{ email: 'member@n8n.io' }]);
			const memberId = data[0].id;

			await owner.get('/logout');

			member = request.agent(testServer.app);
			member.use(utils.restPrefix);

			await member.post('/user').send({
				inviterId: ownerId,
				inviteeId: memberId,
				firstName: 'James',
				lastName: 'Smith',
				password: 'abcd1234',
			});
		});

		afterAll(async () => {
			await getConnection().close();
		});

		test('GET /me should return sanitized member', async () => {
			const response = await member.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe('member@n8n.io');
			expect(firstName).toBe('James');
			expect(lastName).toBe('Smith');
			expect(personalizationAnswers).toBeNull();

			utils.expectMemberGlobalRole(globalRole);
		});

		test('PATCH /me should return succeed with valid inputs', () => {
			return validRequests.patchMe(member, 'member');
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(member);
		});

		// test('PATCH /me/password should succeed with valid inputs', () => {
		// 	return validRequests.patchPassword(member);
		// });

		// test('PATCH /me/password should fail with invalid inputs', () => {
		// 	return invalidRequests.patchPassword(member);
		// });

		// test('POST /me/survey should succeed with valid inputs', () => {
		// 	return validRequests.postSurvey(member);
		// });
	});
});

// ----------------------------------
//          valid requests
// ----------------------------------

const validRequests = {
	patchMe: async function (
		requester: request.SuperAgentTest,
		requesterType: 'owner' | 'member' | 'shell',
	) {
		const response = await requester.patch('/me').send({
			email: 'test@n8n.io',
			firstName: 'John',
			lastName: 'Smith',
			password: 'abcd1234',
		});

		expect(response.statusCode).toBe(200);

		const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
			response.body.data;

		expect(validator.isUUID(id)).toBe(true);
		expect(email).toBe('test@n8n.io');
		expect(firstName).toBe('John');
		expect(lastName).toBe('Smith');

		expect(personalizationAnswers).toBeNull();

		requesterType === 'member'
			? utils.expectMemberGlobalRole(globalRole)
			: utils.expectOwnerGlobalRole(globalRole);
	},

	patchPassword: async function (requester: request.SuperAgentTest) {
		const response = await requester.patch('/me/password').send({ password: 'abcd1234' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
	},

	postSurvey: async function (requester: request.SuperAgentTest) {
		const fullSurveyResponse = await requester.post('/me/survey').send({
			codingSkill: 'a',
			companyIndustry: 'b',
			companySize: 'c',
			otherCompanyIndustry: 'd',
			otherWorkArea: 'e',
			workArea: 'f',
		});

		expect(fullSurveyResponse.statusCode).toBe(200);
		expect(fullSurveyResponse.body).toEqual(SUCCESS_RESPONSE_BODY);

		const emptySurveyResponse = await requester.post('/me/survey').send({});

		expect(emptySurveyResponse.statusCode).toBe(200);
		expect(emptySurveyResponse.body).toEqual(SUCCESS_RESPONSE_BODY);
	},
};

// ----------------------------------
//         invalid requests
// ----------------------------------

const invalidRequests = {
	patchMe: async function (requester: request.SuperAgentTest) {
		const invalidPayloads = [
			{
				email: 'invalid email',
				firstName: 'John',
				lastName: 'Smith',
			},
			{
				email: 'test@n8n.io',
				firstName: '',
				lastName: 'Smith',
			},
			{
				email: 'test@n8n.io',
				firstName: 'John',
				lastName: '',
			},
			{
				email: 'test@n8n.io',
				firstName: 123,
				lastName: 'Smith',
			},
		];

		invalidPayloads.forEach(async (invalidPayload) => {
			await requester.patch('/me').send(invalidPayload).expect(400);
		});
	},

	patchPassword: async function (requester: request.SuperAgentTest) {
		const invalidPayloads: Array<{ password?: string }> = [
			'abc',
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit accumsan.',
		].map((password) => ({ password }));

		invalidPayloads.push({});

		invalidPayloads.forEach(async (invalidPayload) => {
			await requester.patch('/me/password').send(invalidPayload).expect(400);
		});
	},
};
