import express = require('express');
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
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

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

		test('PATCH /me should succeed with valid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

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
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

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
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

			const validPayloads = ['abcd1234', 'q38rdun9!8a'].map((password) => ({ password }));

			for (const validPayload of validPayloads) {
				const response = await shellAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

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
			const shell = await Db.collections.User!.findOneOrFail();
			const shellAgent = await utils.createAgent(app, shell);

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
			const ownerAgent = await utils.createAgent(app, owner);

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
			const ownerAgent = await utils.createAgent(app, owner);

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
			const ownerAgent = await utils.createAgent(app, owner);

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
			const ownerAgent = await utils.createAgent(app, owner);

			const validPayloads = ['abcd1234', 'q38rdun9!8a'].map((password) => ({ password }));

			for (const validPayload of validPayloads) {
				const response = await ownerAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const owner = await Db.collections.User!.findOneOrFail();
			const ownerAgent = await utils.createAgent(app, owner);

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
			const ownerAgent = await utils.createAgent(app, owner);

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

		beforeAll(async () => {
			app = utils.initTestServer({ meEndpoints: true, usersEndpoints: true });
			await utils.initTestDb();
			await Db.collections.User!.clear(); // remove user added by migration
		});

		beforeEach(async () => {
			const role = await Db.collections.Role!.findOneOrFail({ name: 'member', scope: 'global' });

			const newMember = new User();

			Object.assign(newMember, {
				id: uuid(),
				email: 'member@n8n.io',
				firstName: 'John',
				lastName: 'Smith',
				password: hashSync('abcd1234', genSaltSync(10)),
				globalRole: role,
			});

			await Db.collections.User!.save(newMember);

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

		test('GET /me should return sanitized member', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

			const response = await memberAgent.get('/me');

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
			expect(email).toBe('member@n8n.io');
			expect(firstName).toBe('John');
			expect(lastName).toBe('Smith');
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(resetPasswordToken).toBeUndefined();
			expect(globalRole.name).toBe('member');
			expect(globalRole.scope).toBe('global');
		});

		test('PATCH /me should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

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
				const response = await memberAgent.patch('/me').send(validPayload);

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
				expect(globalRole.name).toBe('member');
				expect(globalRole.scope).toBe('global');
			}
		});

		test('PATCH /me should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

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
				await memberAgent.patch('/me').send(invalidPayload).expect(400);
			}
		});

		test('PATCH /me/password should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

			const validPayloads = ['abcd1234', 'q38rdun9!8a'].map((password) => ({ password }));

			for (const validPayload of validPayloads) {
				const response = await memberAgent.patch('/me/password').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});

		test('PATCH /me/password should fail with invalid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

			const invalidPayloads: Array<{ password?: string }> = [
				'a',
				'This is an extremely long password that should never ever be accepted.',
			].map((password) => ({ password }));

			invalidPayloads.push({});

			for (const invalidPayload of invalidPayloads) {
				await memberAgent.patch('/me/password').send(invalidPayload).expect(400);
			}
		});

		test('POST /me/survey should succeed with valid inputs', async () => {
			const member = await Db.collections.User!.findOneOrFail();
			const memberAgent = await utils.createAgent(app, member);

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
				const response = await memberAgent.post('/me/survey').send(validPayload);
				expect(response.statusCode).toBe(200);
				expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			}
		});
	});
});
