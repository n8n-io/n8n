import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, Variables } from '@n8n/db';
import { Container } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';
import {
	createProjectVariable,
	createVariable,
	getVariableById,
	getVariableByKey,
} from '@test-integration/db/variables';

import { createOwner, createUser } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let project: Project;

const testServer = utils.setupTestServer({ endpointGroups: ['variables'] });
const license = testServer.license;

beforeAll(async () => {
	const owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	const member = await createUser();
	authMemberAgent = testServer.authAgentFor(member);

	project = await createTeamProject();
	await linkUserToProject(member, project, 'project:editor');

	license.setDefaults({
		features: ['feat:variables'],
		// quota: {
		// 	'quota:maxVariables': -1,
		// },
	});
});

beforeEach(async () => {
	await testDb.truncate(['Variables']);
});

// ----------------------------------------
// GET /variables - fetch all variables
// ----------------------------------------
describe('GET /variables', () => {
	beforeEach(async () => {
		await Promise.all([
			createVariable('test1', 'value1'),
			createVariable('test2', 'value2'),
			createVariable('empty', ''),
			createProjectVariable('testProject1', 'projectValue1', project),
		]);
	});

	test('should return an empty array if there is nothing in the cache', async () => {
		const cacheService = Container.get(CacheService);
		const spy = jest.spyOn(cacheService, 'get').mockResolvedValueOnce(undefined);
		const response = await authOwnerAgent.get('/variables');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(0);
	});

	test('should return all variables for an owner', async () => {
		const response = await authOwnerAgent.get('/variables');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);
	});

	test('should return all variables for a member', async () => {
		const response = await authMemberAgent.get('/variables');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);
	});

	describe('state:empty', () => {
		test('only return empty variables', async () => {
			const response = await authOwnerAgent.get('/variables').query({ state: 'empty' });
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(1);
			expect(response.body.data[0]).toMatchObject({ key: 'empty', value: '', type: 'string' });
		});
	});
});

// ----------------------------------------
// GET /variables/:id - get a single variable
// ----------------------------------------
describe('GET /variables/:id', () => {
	let var1: Variables, var2: Variables;
	beforeEach(async () => {
		[var1, var2] = await Promise.all([
			createVariable('test1', 'value1'),
			createVariable('test2', 'value2'),
		]);
	});

	test('should return a single variable for an owner', async () => {
		const response1 = await authOwnerAgent.get(`/variables/${var1.id}`);
		expect(response1.statusCode).toBe(200);
		expect(response1.body.data.key).toBe('test1');

		const response2 = await authOwnerAgent.get(`/variables/${var2.id}`);
		expect(response2.statusCode).toBe(200);
		expect(response2.body.data.key).toBe('test2');
	});

	test('should return a single variable for a member', async () => {
		const response1 = await authMemberAgent.get(`/variables/${var1.id}`);
		expect(response1.statusCode).toBe(200);
		expect(response1.body.data.key).toBe('test1');

		const response2 = await authMemberAgent.get(`/variables/${var2.id}`);
		expect(response2.statusCode).toBe(200);
		expect(response2.body.data.key).toBe('test2');
	});
});

// ----------------------------------------
// POST /variables - create a new variable
// ----------------------------------------
describe('POST /variables', () => {
	const generatePayload = (i = 1) => ({
		key: `create${i}`,
		value: `createvalue${i}`,
	});
	const toCreate = generatePayload();

	test('should create a new variable and return it for an owner', async () => {
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.key).toBe(toCreate.key);
		expect(response.body.data.value).toBe(toCreate.value);

		const [byId, byKey] = await Promise.all([
			getVariableById(response.body.data.id),
			getVariableByKey(toCreate.key),
		]);

		expect(byId).not.toBeNull();
		expect(byId!.key).toBe(toCreate.key);
		expect(byId!.value).toBe(toCreate.value);

		expect(byKey).not.toBeNull();
		expect(byKey!.id).toBe(response.body.data.id);
		expect(byKey!.value).toBe(toCreate.value);
	});

	test('should not create a new variable and return it for a member', async () => {
		const response = await authMemberAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(403);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);

		const byKey = await getVariableByKey(toCreate.key);
		expect(byKey).toBeNull();
	});

	test("should not create a new variable and return it if the instance doesn't have a license", async () => {
		license.disable('feat:variables');
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(403);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);

		const byKey = await getVariableByKey(toCreate.key);
		expect(byKey).toBeNull();
	});

	test('should fail to create a new variable and if one with the same key exists', async () => {
		await createVariable(toCreate.key, toCreate.value);
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);
	});

	test('should not fail if variable limit not reached', async () => {
		license.setQuota('quota:maxVariables', 5);
		let i = 1;
		let toCreate = generatePayload(i);
		while (i < 3) {
			await createVariable(toCreate.key, toCreate.value);
			i++;
			toCreate = generatePayload(i);
		}
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(200);
		expect(response.body.data?.key).toBe(toCreate.key);
		expect(response.body.data?.value).toBe(toCreate.value);
	});

	test('should fail if variable limit reached', async () => {
		license.setQuota('quota:maxVariables', 5);
		let i = 1;
		let toCreate = generatePayload(i);
		while (i < 6) {
			await createVariable(toCreate.key, toCreate.value);
			i++;
			toCreate = generatePayload(i);
		}
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);
	});

	test('should fail if key too long', async () => {
		const toCreate = {
			// 51 'a's
			key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
			value: 'value',
		};
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);
	});

	test('should fail if value too long', async () => {
		const toCreate = {
			key: 'key',
			// 1001 'a's
			value: Array(1001).fill('a').join(''),
		};
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);
	});

	test("should fail if key contain's prohibited characters", async () => {
		const toCreate = {
			// 51 'a's
			key: 'te$t',
			value: 'value',
		};
		const response = await authOwnerAgent.post('/variables').send(toCreate);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toCreate.key);
		expect(response.body.data?.value).not.toBe(toCreate.value);
	});
});

// ----------------------------------------
// PATCH /variables/:id - change a variable
// ----------------------------------------
describe('PATCH /variables/:id', () => {
	const toModify = {
		key: 'create1',
		value: 'createvalue1',
	};

	test('should modify existing variable if use is an owner', async () => {
		const variable = await createVariable('test1', 'value1');
		const response = await authOwnerAgent.patch(`/variables/${variable.id}`).send(toModify);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.key).toBe(toModify.key);
		expect(response.body.data.value).toBe(toModify.value);

		const [byId, byKey] = await Promise.all([
			getVariableById(response.body.data.id),
			getVariableByKey(toModify.key),
		]);

		expect(byId).not.toBeNull();
		expect(byId!.key).toBe(toModify.key);
		expect(byId!.value).toBe(toModify.value);

		expect(byKey).not.toBeNull();
		expect(byKey!.id).toBe(response.body.data.id);
		expect(byKey!.value).toBe(toModify.value);
	});

	test('should modify existing variable if use is an owner', async () => {
		const variable = await createVariable('test1', 'value1');
		const response = await authOwnerAgent.patch(`/variables/${variable.id}`).send(toModify);
		expect(response.statusCode).toBe(200);
		expect(response.body.data.key).toBe(toModify.key);
		expect(response.body.data.value).toBe(toModify.value);

		const [byId, byKey] = await Promise.all([
			getVariableById(response.body.data.id),
			getVariableByKey(toModify.key),
		]);

		expect(byId).not.toBeNull();
		expect(byId!.key).toBe(toModify.key);
		expect(byId!.value).toBe(toModify.value);

		expect(byKey).not.toBeNull();
		expect(byKey!.id).toBe(response.body.data.id);
		expect(byKey!.value).toBe(toModify.value);
	});

	test('should not modify existing variable if use is a member', async () => {
		const variable = await createVariable('test1', 'value1');
		const response = await authMemberAgent.patch(`/variables/${variable.id}`).send(toModify);
		expect(response.statusCode).toBe(403);
		expect(response.body.data?.key).not.toBe(toModify.key);
		expect(response.body.data?.value).not.toBe(toModify.value);

		const byId = await getVariableById(variable.id);
		expect(byId).not.toBeNull();
		expect(byId!.key).not.toBe(toModify.key);
		expect(byId!.value).not.toBe(toModify.value);
	});

	test('should not modify existing variable if one with the same key exists', async () => {
		const [var1] = await Promise.all([
			createVariable('test1', 'value1'),
			createVariable(toModify.key, toModify.value),
		]);
		const response = await authOwnerAgent.patch(`/variables/${var1.id}`).send(toModify);
		expect(response.statusCode).toBe(400);
		expect(response.body.data?.key).not.toBe(toModify.key);
		expect(response.body.data?.value).not.toBe(toModify.value);

		const byId = await getVariableById(var1.id);
		expect(byId).not.toBeNull();
		expect(byId!.key).toBe(var1.key);
		expect(byId!.value).toBe(var1.value);
	});
});

// ----------------------------------------
// DELETE /variables/:id - change a variable
// ----------------------------------------
describe('DELETE /variables/:id', () => {
	test('should delete a single variable for an owner', async () => {
		const [var1] = await Promise.all([
			createVariable('test1', 'value1'),
			createVariable('test2', 'value2'),
			createVariable('test3', 'value3'),
		]);

		const delResponse = await authOwnerAgent.delete(`/variables/${var1.id}`);
		expect(delResponse.statusCode).toBe(200);

		const byId = await getVariableById(var1.id);
		expect(byId).toBeNull();

		const getResponse = await authOwnerAgent.get('/variables');
		expect(getResponse.body.data.length).toBe(2);
	});

	test('should not delete a single variable for a member', async () => {
		const [var1] = await Promise.all([
			createVariable('test1', 'value1'),
			createVariable('test2', 'value2'),
			createVariable('test3', 'value3'),
		]);

		const delResponse = await authMemberAgent.delete(`/variables/${var1.id}`);
		expect(delResponse.statusCode).toBe(403);

		const byId = await getVariableById(var1.id);
		expect(byId).not.toBeNull();

		const getResponse = await authMemberAgent.get('/variables');
		expect(getResponse.body.data.length).toBe(3);
	});
});
