// 1. use SQL **instead** of exercising the routes
// helper to insert random 'member' user

// 2. move user creation to test

// 3. TRUNCATE user tables on afterEach (clean DB)

// 4. Figure out connection error: ConnectionIsNotSetError: Connection with sqlite database is not established. Check connection configuration.

import express = require('express');
import * as request from 'supertest';
import { getConnection } from 'typeorm';
import validator from 'validator';
import { v4 as uuid } from 'uuid';

import config = require('../config');
import * as utils from './shared/utils';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { Db } from '../src';
import { hashSync, genSaltSync } from 'bcryptjs';
import { User } from '../src/databases/entities/User';

describe('/me endpoints', () => {
	// ----------------------------------
	//          shell requests
	// ----------------------------------

	describe('Shell requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ meEndpoints: true });
			await utils.initTestDb();
			await Db.collections.User!.clear(); // remove user added by migration
		});

		beforeEach(async () => {
			const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'global' });

			await Db.collections.User!.save({
				id: uuid(),
				firstName: 'default',
				lastName: 'default',
				createdAt: new Date(),
				updatedAt: new Date(),
				globalRole: role,
			});
		});

		afterEach(async () => {
			await Db.collections.User!.clear();
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized shell', async () => {
			const shellAgent = await utils.createShellAgent(app);

			const response = await shellAgent.get('/me');

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
				resetPasswordToken,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBeNull();
			expect(firstName).toBe('default');
			expect(lastName).toBe('default');
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should return succeed with valid inputs', async () => {
			const shellAgent = await utils.createShellAgent(app);

			const validPayloads = [
				{
					email: 'test@n8n.io',
					firstName: 'John',
					lastName: 'Smith',
					password: 'abcd1234',
				},
				{
					email: 'abc@def.com',
					firstName: 'John',
					lastName: 'Smith',
					password: 'abcd1234',
				},
			];

			for (const validPayload of validPayloads) {
				const response = await shellAgent.patch('/me').send(validPayload);

				expect(response.statusCode).toBe(200);

				const {
					id,
					email,
					firstName,
					lastName,
					personalizationAnswers,
					globalRole,
					password,
					resetPasswordToken,
				} = response.body.data;

				expect(validator.isUUID(id)).toBe(true);
				expect(email).toBe(validPayload.email);
				expect(firstName).toBe(validPayload.firstName);
				expect(lastName).toBe(validPayload.lastName);
				expect(personalizationAnswers).toBeNull();
				expect(password).toBeUndefined();
				expect(resetPasswordToken).toBeUndefined();
				expect(globalRole.name).toBe('owner');
				expect(globalRole.scope).toBe('global');
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const shellAgent = await utils.createShellAgent(app);

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

			for (const invalidPayload of invalidPayloads) {
				await shellAgent.patch('/me').send(invalidPayload).expect(400);
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const shellAgent = await utils.createShellAgent(app);

			const validPayloads = ['abcd1234', 'q38rdun9!8a'].map((password) => ({ password }));

			for (const validPayload of validPayloads) {
				const response = await shellAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const shellAgent = await utils.createShellAgent(app);

			const invalidPayloads: Array<{ password?: string }> = [
				'a',
				'This is an extremely long password that should never ever be accepted.',
			].map((password) => ({ password }));

			invalidPayloads.push({});

			for (const invalidPayload of invalidPayloads) {
				await shellAgent.patch('/me/password').send(invalidPayload).expect(400);
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const shellAgent = await utils.createShellAgent(app);

			const validPayloads = [
				{
					codingSkill: 'a',
					companyIndustry: 'b',
					companySize: 'c',
					otherCompanyIndustry: 'd',
					otherWorkArea: 'e',
					workArea: 'f',
				},
				{},
			];

			for (const validPayload of validPayloads) {
				const response = await shellAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});
	});

	// ----------------------------------
	//          owner requests
	// ----------------------------------

	describe('Owner requests', () => {
		let app: express.Application;

		beforeAll(async () => {
			app = utils.initTestServer({ meEndpoints: true });
			await utils.initTestDb();
			await Db.collections.User!.clear(); // remove user added by migration
		});

		beforeEach(async () => {
			const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'global' });

			const newOwner = new User();

			Object.assign(newOwner, {
				id: uuid(),
				email: 'owner@n8n.io',
				firstName: 'John',
				lastName: 'Smith',
				password: hashSync('abcd1234', genSaltSync(10)),
				globalRole: role,
			});

			await Db.collections.User!.save(newOwner);

			config.set('userManagement.hasOwner', true);

			await Db.collections.Settings!.update(
				{ key: 'userManagement.hasOwner' },
				{ value: JSON.stringify(true) },
			);
		});

		afterEach(async () => {
			await Db.collections.User!.clear();
		});

		afterAll(() => {
			return getConnection().close();
		});

		test('GET /me should return sanitized owner', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

			const response = await ownerAgent.get('/me');

			expect(response.statusCode).toBe(200);

			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				globalRole,
				password,
				resetPasswordToken,
			} = response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe('owner@n8n.io');
			expect(firstName).toBe('John');
			expect(lastName).toBe('Smith');
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('owner');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should succeed with valid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

			const validPayloads = [
				{
					email: 'test@n8n.io',
					firstName: 'John',
					lastName: 'Smith',
					password: 'abcd1234',
				},
				{
					email: 'abc@def.com',
					firstName: 'John',
					lastName: 'Smith',
					password: 'ghij5678',
				},
			];

			for (const validPayload of validPayloads) {
				const response = await ownerAgent.patch('/me').send(validPayload);

				expect(response.statusCode).toBe(200);

				const {
					id,
					email,
					firstName,
					lastName,
					personalizationAnswers,
					globalRole,
					password,
					resetPasswordToken,
				} = response.body.data;

				expect(validator.isUUID(id)).toBe(true);
				expect(email).toBe(validPayload.email);
				expect(firstName).toBe(validPayload.firstName);
				expect(lastName).toBe(validPayload.lastName);
				expect(personalizationAnswers).toBeNull();
				expect(password).toBeUndefined();
				expect(resetPasswordToken).toBeUndefined();
				expect(globalRole.name).toBe('owner');
				expect(globalRole.scope).toBe('global');
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

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

			for (const invalidPayload of invalidPayloads) {
				await ownerAgent.patch('/me').send(invalidPayload).expect(400);
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

			const validPayloads = ['abcd1234', 'q38rdun9!8a'].map((password) => ({ password }));

			for (const validPayload of validPayloads) {
				const response = await ownerAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

			const invalidPayloads: Array<{ password?: string }> = [
				'a',
				'This is an extremely long password that should never ever be accepted.',
			].map((password) => ({ password }));

			invalidPayloads.push({});

			for (const invalidPayload of invalidPayloads) {
				await ownerAgent.patch('/me/password').send(invalidPayload).expect(400);
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createOwnerAgent(app, owner);

			const validPayloads = [
				{
					codingSkill: 'a',
					companyIndustry: 'b',
					companySize: 'c',
					otherCompanyIndustry: 'd',
					otherWorkArea: 'e',
					workArea: 'f',
				},
				{},
			];

			for (const validPayload of validPayloads) {
				const response = await ownerAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});
	});

	// ----------------------------------
	//          member requests
	// ----------------------------------

	describe('Member requests', () => {
		let app: express.Application;
		let owner: request.SuperAgentTest;
		let member: request.SuperAgentTest;

		beforeAll(async () => {
			app = utils.initTestServer({ meEndpoints: true, usersEndpoints: true });
			await utils.initTestDb();

			config.set('userManagement.emails.mode', 'smtp'); // needed for POST /users

			owner = request.agent(app);
			owner.use(utils.restPrefix);

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

			member = request.agent(app);
			member.use(utils.restPrefix);

			await member.post('/user').send({
				inviterId: ownerId,
				inviteeId: memberId,
				firstName: 'James',
				lastName: 'Smith',
				password: 'abcd1234',
			});
		});

		afterAll(() => {
			return getConnection().close();
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

		// test('PATCH /me should return succeed with valid inputs', () => {
		// 	return validRequests.patchMe(member, 'member');
		// });

		// test('PATCH /me should fail with invalid inputs', () => {
		// 	return invalidRequests.patchMe(member);
		// });

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
