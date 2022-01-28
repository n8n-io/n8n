import { getConnection } from 'typeorm';
import * as request from 'supertest';
import express = require('express');

import { Db } from '../src';
import { meNamespace } from '../src/UserManagement/routes/me';
import { SUCCESSFUL_MUTATION_RESPONSE_BODY } from './constants';
import { expectOwnerGlobalRole, initTestServer, restPrefix } from './utils';
import { ROUTES, TEST_PAYLOADS } from './constants/me';

describe('/me namespace', () => {
	let testServer: {
		app: express.Application;
		restEndpoint: string;
	};

	beforeAll(async () => {
		testServer = initTestServer();

		meNamespace.apply(testServer);

		await Db.init();
		await getConnection().runMigrations({ transaction: 'none' });
	});

	afterAll(() => getConnection().close());

	describe('If requester is unauthorized', () => {
		ROUTES.forEach((route) => {
			const [method, endpoint] = route.split(' ').map((i) => i.toLowerCase());

			test(`${route} should return 401 Unauthorized`, async () => {
				// @ts-ignore TODO: module augmentation
				const response = await request(testServer.app)[method](endpoint).use(restPrefix);

				expect(response.statusCode).toBe(401);
			});
		});
	});

	describe('If requester is authorized', () => {
		describe('If requester is shell user', () => {
			let agent: request.SuperAgentTest;

			beforeAll(async () => {
				agent = request.agent(testServer.app);
				await agent.get('/login').use(restPrefix);
			});

			test("GET /me should return shell user's sanitized data", async () => {
				const response = await agent.get('/me').use(restPrefix);

				expect(response.statusCode).toBe(200);

				const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
					response.body.data;

				expect(typeof id).toBe('string');
				expect(email).toBeNull();
				expect(firstName).toBe('default');
				expect(lastName).toBe('default');
				expect(personalizationAnswers).toBeNull();

				expectOwnerGlobalRole(globalRole);
			});

			test("PATCH /me should return shell user's updated sanitized data", async () => {
				const response = await agent.patch('/me').send(TEST_PAYLOADS.PROFILE).use(restPrefix);

				expect(response.statusCode).toBe(200);

				const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
					response.body.data;

				expect(typeof id).toBe('string');
				expect(email).toBe(TEST_PAYLOADS.PROFILE.email);
				expect(firstName).toBe(TEST_PAYLOADS.PROFILE.firstName);
				expect(lastName).toBe(TEST_PAYLOADS.PROFILE.lastName);
				expect(personalizationAnswers).toBeNull();

				expectOwnerGlobalRole(globalRole);
			});

			test('PATCH /me/password should return success response', async () => {
				const response = await agent
					.patch('/me/password')
					.send(TEST_PAYLOADS.PASSWORD)
					.use(restPrefix);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESSFUL_MUTATION_RESPONSE_BODY);
			});

			test('POST /me/survey should return success response', async () => {
				const response = await agent
					.patch('/me/password')
					.send(TEST_PAYLOADS.PASSWORD)
					.use(restPrefix);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESSFUL_MUTATION_RESPONSE_BODY);
			});
		});

		describe('If requester is owner', () => {
			let agent: request.SuperAgentTest;

			beforeAll(async () => {
				agent = request.agent(testServer.app);
				await agent.post('/owner-setup').send(TEST_PAYLOADS.OWNER_SETUP).use(restPrefix);
				await agent.post('/login').send(TEST_PAYLOADS.OWNER_LOGIN).use(restPrefix);
			});

			test("GET /me should return owner's sanitized data", async () => {
				const response = await agent.get('/me').use(restPrefix);

				expect(response.statusCode).toBe(200);

				const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
					response.body.data;

				expect(typeof id).toBe('string');
				expect(email).toBe(TEST_PAYLOADS.OWNER_LOGIN.email);
				expect(firstName).toBe(TEST_PAYLOADS.OWNER_SETUP.firstName);
				expect(lastName).toBe(TEST_PAYLOADS.OWNER_SETUP.lastName);
				expect(personalizationAnswers).toBeNull();

				expectOwnerGlobalRole(globalRole);
			});

			test("PATCH /me should return owner's updated sanitized data", async () => {
				const response = await agent.patch('/me').send(TEST_PAYLOADS.PROFILE).use(restPrefix);

				expect(response.statusCode).toBe(200);

				const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
					response.body.data;

				expect(typeof id).toBe('string');
				expect(email).toBe(TEST_PAYLOADS.PROFILE.email);
				expect(firstName).toBe(TEST_PAYLOADS.PROFILE.firstName);
				expect(lastName).toBe(TEST_PAYLOADS.PROFILE.lastName);
				expect(personalizationAnswers).toBeNull();

				expectOwnerGlobalRole(globalRole);
			});

			test('PATCH /me/password should return success response', async () => {
				const response = await agent
					.patch('/me/password')
					.send(TEST_PAYLOADS.PASSWORD)
					.use(restPrefix);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESSFUL_MUTATION_RESPONSE_BODY);
			});

			test('POST /me/survey should return success response', async () => {
				const response = await agent
					.patch('/me/password')
					.send(TEST_PAYLOADS.PASSWORD)
					.use(restPrefix);

				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESSFUL_MUTATION_RESPONSE_BODY);
			});
		});

		describe('If requester is member', () => {
			// TODO
		});

		// PENDING: input validation in all test suite groups
	});
});
