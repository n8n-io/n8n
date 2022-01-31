import { getConnection } from 'typeorm';
import * as request from 'supertest';
import express = require('express');
import validator from 'validator';

import { Db } from '../src';
import { meNamespace } from '../src/UserManagement/routes/me';
import { restPrefix } from './utils';
import * as utils from './utils';
import { SUCCESS_RESPONSE_BODY } from './constants';

describe('/me endpoints', () => {
	let testServer: {
		app: express.Application;
		restEndpoint: string;
	};

	beforeAll(async () => {
		testServer = utils.initTestServer();

		meNamespace.apply(testServer);

		await Db.init();
		await getConnection().runMigrations({ transaction: 'none' });
	});

	afterAll(() => {
		getConnection().close();
	});

	describe('Shell requests', () => {
		let shell: request.SuperAgentTest;

		beforeAll(async () => {
			shell = request.agent(testServer.app);
			shell.use(restPrefix);
			await shell.get('/login');
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
			return validRequests.patchMe(shell, { expectSurvey: false });
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(shell, { expectSurvey: false });
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
	});

	describe('Owner requests', () => {
		let owner: request.SuperAgentTest;

		beforeAll(async () => {
			owner = request.agent(testServer.app);
			owner.use(restPrefix);

			await owner.post('/owner-setup').send({
				email: 'test@n8n.io',
				firstName: 'John',
				lastName: 'Smith',
				password: 'abcd1234',
			});

			await owner.post('/login').send({
				email: 'test@n8n.io',
				password: 'abcd1234',
			});
		});

		test('GET /me should return sanitized owner', async () => {
			const response = await owner.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe('test@n8n.io');
			expect(firstName).toBe('John');
			expect(lastName).toBe('Smith');
			expect(personalizationAnswers).toEqual({
				codingSkill: 'a',
				companyIndustry: 'b',
				companySize: 'c',
				otherCompanyIndustry: 'd',
				otherWorkArea: 'e',
				workArea: 'f',
			});

			utils.expectOwnerGlobalRole(globalRole);
		});

		test('PATCH /me should return updated sanitized owner', () => {
			return validRequests.patchMe(owner, { expectSurvey: true });
		});

		test('PATCH /me should fail with invalid inputs', () => {
			return invalidRequests.patchMe(owner, { expectSurvey: false });
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
	});

	describe('If requester is member', () => {
		// TODO
	});
});

const sampleSurvey = {
	codingSkill: 'a',
	companyIndustry: 'b',
	companySize: 'c',
	otherCompanyIndustry: 'd',
	otherWorkArea: 'e',
	workArea: 'f',
};

// ----------------------------------
//          valid requests
// ----------------------------------

const validRequests = {
	patchMe: async function (
		requester: request.SuperAgentTest,
		{ expectSurvey }: { expectSurvey: boolean },
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

		expectSurvey
			? expect(personalizationAnswers).toEqual(sampleSurvey)
			: expect(personalizationAnswers).toBeNull();

		utils.expectOwnerGlobalRole(globalRole);
	},

	patchPassword: async function (requester: request.SuperAgentTest) {
		const response = await requester.patch('/me/password').send({ password: 'abcd1234' });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
	},

	postSurvey: async function (requester: request.SuperAgentTest) {
		const response = await requester.post('/me/survey').send(sampleSurvey);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
	},
};

// ----------------------------------
//         invalid requests
// ----------------------------------

const invalidRequests = {
	patchMe: async function (
		requester: request.SuperAgentTest,
		{ expectSurvey }: { expectSurvey: boolean },
	) {
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
		const invalidPayloads: object[] = [
			'abc',
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit accumsan.',
		].map((password) => ({ password }));

		invalidPayloads.push({});

		invalidPayloads.forEach(async (invalidPayload) => {
			await requester.patch('/me').send(invalidPayload).expect(400);
		});
	},

	postSurvey: async function (requester: request.SuperAgentTest) {
		const response = await requester.post('/me/survey').send({ wrongKey: 123 });

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
	},
};
