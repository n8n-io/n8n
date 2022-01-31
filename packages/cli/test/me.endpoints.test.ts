import { getConnection } from 'typeorm';
import * as request from 'supertest';
import express = require('express');
import validator from 'validator';

import { Db } from '../src';
import { meNamespace } from '../src/UserManagement/routes/me';
import * as utils from './common/utils';
import { SUCCESS_RESPONSE_BODY } from './common/constants';

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

		afterAll(async () => {
			await getConnection().close();
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

		test('PATCH /me should return updated sanitized shell', () => {
			return validRequests.patchMe(shell);
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(shell);
		});

		test('PATCH /me/password should return success response', () => {
			return validRequests.patchPassword(shell);
		});

		// TODO: Not working
		// test('PATCH /me/password should fail with invalid inputs', () => {
		// 	return invalidRequests.patchPassword(shell);
		// });

		test('POST /me/survey should return success response', () => {
			return validRequests.postSurvey(shell);
		});

		// TODO: Not working
		// test('POST /me/survey should fail with invalid inputs', () => {
		// 	return invalidRequests.postSurvey(shell);
		// });
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

		test('PATCH /me should return updated sanitized owner', () => {
			return validRequests.patchMe(owner);
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(owner);
		});

		test('PATCH /me/password should return success response', () => {
			return validRequests.patchPassword(owner);
		});

		// TODO: Not working
		// test('PATCH /me/password should fail with invalid inputs', () => {
		// 	return invalidRequests.patchPassword(owner);
		// });

		test('POST /me/survey should return success response', () => {
			return validRequests.postSurvey(owner);
		});

		// TODO: Not working
		// test('POST /me/survey should fail with invalid inputs', () => {
		// 	return invalidRequests.postSurvey(owner);
		// });
	});

	describe('Member requests', () => {
		// TODO
	});
});

// ----------------------------------
//          valid requests
// ----------------------------------

const validRequests = {
	patchMe: async function (requester: request.SuperAgentTest) {
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

		utils.expectOwnerGlobalRole(globalRole);
	},

	patchPassword: async function (requester: request.SuperAgentTest) {
		const response = await requester.patch('/me/password').send({ password: 'abcd1234' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
	},

	postSurvey: async function (requester: request.SuperAgentTest) {
		const response = await requester.post('/me/survey').send({
			codingSkill: 'a',
			companyIndustry: 'b',
			companySize: 'c',
			otherCompanyIndustry: 'd',
			otherWorkArea: 'e',
			workArea: 'f',
		});

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
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

	postSurvey: async function (requester: request.SuperAgentTest) {
		const response = await requester.post('/me/survey').send({ wrongKey: 123 });

		expect(response.statusCode).toBe(400);
	},
};
