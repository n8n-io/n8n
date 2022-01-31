import { getConnection } from 'typeorm';
import * as request from 'supertest';
import express = require('express');
import validator from 'validator';

import { Db } from '../src';
import { meNamespace } from '../src/UserManagement/routes/me';
import { restPrefix } from './utils';
import { PAYLOADS } from './constants/me';
import * as common from './common';

describe('/me namespace', () => {
	let testServer: {
		app: express.Application;
		restEndpoint: string;
	};

	beforeAll(async () => {
		testServer = common.initTestServer();

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

		test("GET /me should return shell's sanitized data", async () => {
			const response = await shell.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBeNull();
			expect(firstName).toBe('default');
			expect(lastName).toBe('default');
			expect(personalizationAnswers).toBeNull();

			common.expectOwnerGlobalRole(globalRole);
		});

		test("PATCH /me should return shell's updated sanitized data", () => {
			return common.patchMe(shell, { expectSurvey: false });
		});

		test('PATCH /me/password should return success response', () => {
			return common.patchPassword(shell);
		});

		test('POST /me/survey should return success response', () => {
			return common.postSurvey(shell);
		});
	});

	describe('Owner requests', () => {
		let owner: request.SuperAgentTest;

		beforeAll(async () => {
			owner = request.agent(testServer.app);
			owner.use(restPrefix);
			await owner.post('/owner-setup').send(PAYLOADS.OWNER_SETUP);
			await owner.post('/login').send(PAYLOADS.OWNER_LOGIN);
		});

		test("GET /me should return owner's sanitized data", async () => {
			const response = await owner.get('/me');

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, globalRole } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(PAYLOADS.OWNER_LOGIN.email);
			expect(firstName).toBe(PAYLOADS.OWNER_SETUP.firstName);
			expect(lastName).toBe(PAYLOADS.OWNER_SETUP.lastName);
			expect(personalizationAnswers).toEqual(PAYLOADS.SURVEY);

			common.expectOwnerGlobalRole(globalRole);
		});

		test("PATCH /me should return owner's updated sanitized data", () => {
			return common.patchMe(owner, { expectSurvey: true });
		});

		test('PATCH /me/password should return success response', () => {
			return common.patchPassword(owner);
		});

		test('POST /me/survey should return success response', () => {
			return common.postSurvey(owner);
		});
	});

	describe('If requester is member', () => {
		// TODO
	});

	// PENDING: input validation in all test suite groups
});
