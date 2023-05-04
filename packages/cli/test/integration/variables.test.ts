import type { Application } from 'express';

import type { User } from '@/databases/entities/User';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils';

import type { AuthAgent } from './shared/types';
import { License } from '@/License';

// mock that credentialsSharing is not enabled
let app: Application;
let ownerUser: User;
let memberUser: User;
let authAgent: AuthAgent;
let variablesSpy: jest.SpyInstance<boolean>;
const licenseLike = {
	isVariablesEnabled: jest.fn().mockReturnValue(true),
	getVariablesLimit: jest.fn().mockReturnValue(-1),
};

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['variables'] });

	utils.initConfigFile();
	utils.mockInstance(License, licenseLike);

	ownerUser = await testDb.createOwner();
	memberUser = await testDb.createUser();

	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['Variables']);
	licenseLike.isVariablesEnabled.mockReturnValue(true);
	licenseLike.getVariablesLimit.mockReturnValue(-1);
});

afterAll(async () => {
	await testDb.terminate();
});

// ----------------------------------------
// GET /variables - fetch all variables
// ----------------------------------------

test('GET /variables should return all variables for an owner', async () => {
	await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
	]);

	const response = await authAgent(ownerUser).get('/variables');
	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);
});

test('GET /variables should return all variables for a member', async () => {
	await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
	]);

	const response = await authAgent(memberUser).get('/variables');
	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(2);
});

// ----------------------------------------
// GET /variables/:id - get a single variable
// ----------------------------------------

test('GET /variables/:id should return a single variable for an owner', async () => {
	const [var1, var2] = await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
	]);

	const response1 = await authAgent(ownerUser).get(`/variables/${var1.id}`);
	expect(response1.statusCode).toBe(200);
	expect(response1.body.data.key).toBe('test1');

	const response2 = await authAgent(ownerUser).get(`/variables/${var2.id}`);
	expect(response2.statusCode).toBe(200);
	expect(response2.body.data.key).toBe('test2');
});

test('GET /variables/:id should return a single variable for a member', async () => {
	const [var1, var2] = await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
	]);

	const response1 = await authAgent(memberUser).get(`/variables/${var1.id}`);
	expect(response1.statusCode).toBe(200);
	expect(response1.body.data.key).toBe('test1');

	const response2 = await authAgent(memberUser).get(`/variables/${var2.id}`);
	expect(response2.statusCode).toBe(200);
	expect(response2.body.data.key).toBe('test2');
});

// ----------------------------------------
// POST /variables - create a new variable
// ----------------------------------------

test('POST /variables should create a new credential and return it for an owner', async () => {
	const toCreate = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(200);
	expect(response.body.data.key).toBe(toCreate.key);
	expect(response.body.data.value).toBe(toCreate.value);

	const [byId, byKey] = await Promise.all([
		testDb.getVariableById(response.body.data.id),
		testDb.getVariableByKey(toCreate.key),
	]);

	expect(byId).not.toBeNull();
	expect(byId!.key).toBe(toCreate.key);
	expect(byId!.value).toBe(toCreate.value);

	expect(byKey).not.toBeNull();
	expect(byKey!.id).toBe(response.body.data.id);
	expect(byKey!.value).toBe(toCreate.value);
});

test('POST /variables should not create a new credential and return it for a member', async () => {
	const toCreate = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(memberUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(401);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);

	const byKey = await testDb.getVariableByKey(toCreate.key);
	expect(byKey).toBeNull();
});

test("POST /variables should not create a new credential and return it if the instance doesn't have a license", async () => {
	licenseLike.isVariablesEnabled.mockReturnValue(false);
	const toCreate = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(400);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);

	const byKey = await testDb.getVariableByKey(toCreate.key);
	expect(byKey).toBeNull();
});

test('POST /variables should fail to create a new credential and if one with the same key exists', async () => {
	const toCreate = {
		key: 'create1',
		value: 'createvalue1',
	};
	await testDb.createVariable(toCreate.key, toCreate.value);
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(500);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);
});

test('POST /variables should not fail if variable limit not reached', async () => {
	licenseLike.getVariablesLimit.mockReturnValue(5);
	let i = 1;
	let toCreate = {
		key: `create${i}`,
		value: `createvalue${i}`,
	};
	while (i < 3) {
		await testDb.createVariable(toCreate.key, toCreate.value);
		i++;
		toCreate = {
			key: `create${i}`,
			value: `createvalue${i}`,
		};
	}
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(200);
	expect(response.body.data?.key).toBe(toCreate.key);
	expect(response.body.data?.value).toBe(toCreate.value);
});

test('POST /variables should fail if variable limit reached', async () => {
	licenseLike.getVariablesLimit.mockReturnValue(5);
	let i = 1;
	let toCreate = {
		key: `create${i}`,
		value: `createvalue${i}`,
	};
	while (i < 6) {
		await testDb.createVariable(toCreate.key, toCreate.value);
		i++;
		toCreate = {
			key: `create${i}`,
			value: `createvalue${i}`,
		};
	}
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(400);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);
});

test('POST /variables should fail if key too long', async () => {
	const toCreate = {
		// 51 'a's
		key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
		value: 'value',
	};
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(400);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);
});

test('POST /variables should fail if value too long', async () => {
	const toCreate = {
		key: 'key',
		// 256 'a's
		value:
			'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	};
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(400);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);
});

test("POST /variables should fail if key contain's prohibited characters", async () => {
	const toCreate = {
		// 51 'a's
		key: 'te$t',
		value: 'value',
	};
	const response = await authAgent(ownerUser).post('/variables').send(toCreate);
	expect(response.statusCode).toBe(400);
	expect(response.body.data?.key).not.toBe(toCreate.key);
	expect(response.body.data?.value).not.toBe(toCreate.value);
});

// ----------------------------------------
// PATCH /variables/:id - change a variable
// ----------------------------------------

test('PATCH /variables/:id should modify existing credential if use is an owner', async () => {
	const variable = await testDb.createVariable('test1', 'value1');
	const toModify = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(ownerUser).patch(`/variables/${variable.id}`).send(toModify);
	expect(response.statusCode).toBe(200);
	expect(response.body.data.key).toBe(toModify.key);
	expect(response.body.data.value).toBe(toModify.value);

	const [byId, byKey] = await Promise.all([
		testDb.getVariableById(response.body.data.id),
		testDb.getVariableByKey(toModify.key),
	]);

	expect(byId).not.toBeNull();
	expect(byId!.key).toBe(toModify.key);
	expect(byId!.value).toBe(toModify.value);

	expect(byKey).not.toBeNull();
	expect(byKey!.id).toBe(response.body.data.id);
	expect(byKey!.value).toBe(toModify.value);
});

test('PATCH /variables/:id should modify existing credential if use is an owner', async () => {
	const variable = await testDb.createVariable('test1', 'value1');
	const toModify = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(ownerUser).patch(`/variables/${variable.id}`).send(toModify);
	expect(response.statusCode).toBe(200);
	expect(response.body.data.key).toBe(toModify.key);
	expect(response.body.data.value).toBe(toModify.value);

	const [byId, byKey] = await Promise.all([
		testDb.getVariableById(response.body.data.id),
		testDb.getVariableByKey(toModify.key),
	]);

	expect(byId).not.toBeNull();
	expect(byId!.key).toBe(toModify.key);
	expect(byId!.value).toBe(toModify.value);

	expect(byKey).not.toBeNull();
	expect(byKey!.id).toBe(response.body.data.id);
	expect(byKey!.value).toBe(toModify.value);
});

test('PATCH /variables/:id should not modify existing credential if use is a member', async () => {
	const variable = await testDb.createVariable('test1', 'value1');
	const toModify = {
		key: 'create1',
		value: 'createvalue1',
	};
	const response = await authAgent(memberUser).patch(`/variables/${variable.id}`).send(toModify);
	expect(response.statusCode).toBe(401);
	expect(response.body.data?.key).not.toBe(toModify.key);
	expect(response.body.data?.value).not.toBe(toModify.value);

	const byId = await testDb.getVariableById(variable.id);
	expect(byId).not.toBeNull();
	expect(byId!.key).not.toBe(toModify.key);
	expect(byId!.value).not.toBe(toModify.value);
});

test('PATCH /variables/:id should not modify existing credential if one with the same key exists', async () => {
	const toModify = {
		key: 'create1',
		value: 'createvalue1',
	};
	const [var1, var2] = await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable(toModify.key, toModify.value),
	]);
	const response = await authAgent(ownerUser).patch(`/variables/${var1.id}`).send(toModify);
	expect(response.statusCode).toBe(500);
	expect(response.body.data?.key).not.toBe(toModify.key);
	expect(response.body.data?.value).not.toBe(toModify.value);

	const byId = await testDb.getVariableById(var1.id);
	expect(byId).not.toBeNull();
	expect(byId!.key).toBe(var1.key);
	expect(byId!.value).toBe(var1.value);
});

// ----------------------------------------
// DELETE /variables/:id - change a variable
// ----------------------------------------

test('DELETE /variables/:id should delete a single credential for an owner', async () => {
	const [var1, var2, var3] = await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
		testDb.createVariable('test3', 'value3'),
	]);

	const delResponse = await authAgent(ownerUser).delete(`/variables/${var1.id}`);
	expect(delResponse.statusCode).toBe(200);

	const byId = await testDb.getVariableById(var1.id);
	expect(byId).toBeNull();

	const getResponse = await authAgent(ownerUser).get('/variables');
	expect(getResponse.body.data.length).toBe(2);
});

test('DELETE /variables/:id should not delete a single credential for a member', async () => {
	const [var1, var2, var3] = await Promise.all([
		testDb.createVariable('test1', 'value1'),
		testDb.createVariable('test2', 'value2'),
		testDb.createVariable('test3', 'value3'),
	]);

	const delResponse = await authAgent(memberUser).delete(`/variables/${var1.id}`);
	expect(delResponse.statusCode).toBe(401);

	const byId = await testDb.getVariableById(var1.id);
	expect(byId).not.toBeNull();

	const getResponse = await authAgent(memberUser).get('/variables');
	expect(getResponse.body.data.length).toBe(3);
});
