import express from 'express';

import * as Db from '@/Db';
import config from '@/config';
import { Role } from '@db/entities/Role';

import { randomApiKey } from '../shared/random';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['publicApi'],
		applyAuth: false,
		enablePublicAPI: true,
	});

	const [fetchedGlobalOwnerRole, fetchedGlobalMemberRole] =
		await testDb.getAllRoles();

	globalOwnerRole = fetchedGlobalOwnerRole;
	globalMemberRole = fetchedGlobalMemberRole;

	utils.initConfigFile();
});

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'Tag',
		'User',
		'Workflow',
		'Credentials',
	]);

	config.set('userManagement.disabled', false);
	config.set('userManagement.isInstanceOwnerSetUp', true);
});

afterAll(async () => {
	await testDb.terminate();
});

test('GET /tags should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/tags');

	expect(response.statusCode).toBe(401);
});

test('GET /tags should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get('/tags');

	expect(response.statusCode).toBe(401);
});

test('GET /tags should return all tags', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	await Promise.all([
		testDb.createTag({}),
		testDb.createTag({}),
		testDb.createTag({}),
	]);

	const response = await authAgent.get('/tags');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(3);
	expect(response.body.nextCursor).toBeNull();

	for (const tag of response.body.data) {
		const {
			id,
			name,
			createdAt,
			updatedAt,
		} = tag;

		expect(id).toBeDefined();
		expect(name).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
	}
});

test('GET /tags should return all tags with pagination', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	await Promise.all([
		testDb.createTag({}),
		testDb.createTag({}),
		testDb.createTag({}),
	]);

	const response = await authAgent.get('/tags?limit=1');

	expect(response.statusCode).toBe(200);
	expect(response.body.data.length).toBe(1);
	expect(response.body.nextCursor).not.toBeNull();

	const response2 = await authAgent.get(`/tags?limit=1&cursor=${response.body.nextCursor}`);

	expect(response2.statusCode).toBe(200);
	expect(response2.body.data.length).toBe(1);
	expect(response2.body.nextCursor).not.toBeNull();
	expect(response2.body.nextCursor).not.toBe(response.body.nextCursor);

	const responses = [...response.body.data, ...response2.body.data];

	for (const tag of responses) {
		const {
			id,
			name,
			createdAt,
			updatedAt,
		} = tag;

		expect(id).toBeDefined();
		expect(name).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
	}

	// check that we really received a different result
	expect(Number(response.body.data[0].id)).toBeLessThan(Number(response2.body.data[0].id));
});

test('GET /tags/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	owner.apiKey = null;

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/tags/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /tags/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/tags/2`);

	expect(response.statusCode).toBe(401);
});

test('GET /tags/:id should fail due to non-existing tag', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.get(`/tags/2`);

	expect(response.statusCode).toBe(404);
});

test('GET /tags/:id should retrieve tag', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	// create tag
	const tag = await testDb.createTag({});

	const response = await authAgent.get(`/tags/${tag.id}`);

	expect(response.statusCode).toBe(200);

	const { id, name, createdAt, updatedAt } =
		response.body;

	expect(id).toEqual(tag.id);
	expect(name).toEqual(tag.name);
	expect(createdAt).toEqual(tag.createdAt.toISOString());
	expect(updatedAt).toEqual(tag.updatedAt.toISOString());
});

test('DELETE /tags/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/tags/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /tags/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/tags/2`);

	expect(response.statusCode).toBe(401);
});

test('DELETE /tags/:id should fail due to non-existing tag', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.delete(`/tags/2`);

	expect(response.statusCode).toBe(404);
});

test('DELETE /tags/:id owner should delete the tag', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	// create tag
	const tag = await testDb.createTag({});

	const response = await authAgent.delete(`/tags/${tag.id}`);

	expect(response.statusCode).toBe(200);

	const { id, name, createdAt, updatedAt } =
		response.body;

	expect(id).toEqual(tag.id);
	expect(name).toEqual(tag.name);
	expect(createdAt).toEqual(tag.createdAt.toISOString());
	expect(updatedAt).toEqual(tag.updatedAt.toISOString());

	// make sure the tag actually deleted from the db
	const deletedTag = await Db.collections.Tag.findOneBy({
		id: tag.id,
	});

	expect(deletedTag).toBeNull();
});

test('DELETE /tags/:id non-owner should not delete tag', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	// create tag
	const tag = await testDb.createTag({});

	const response = await authAgent.delete(`/tags/${tag.id}`);

	expect(response.statusCode).toBe(403);

	const { message } =
		response.body;

	expect( message ).toEqual("You are not allowed to perform this action. Only owners can remove tags");

	// make sure the tag was not deleted from the db
	const notDeletedTag = await Db.collections.Tag.findOneBy({
		id: tag.id,
	});

	expect(notDeletedTag).not.toBeNull();
});

test('POST /tags should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post('/tags');

	expect(response.statusCode).toBe(401);
});

test('POST /tags should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post('/tags');

	expect(response.statusCode).toBe(401);
});

test('POST /tags should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.post('/tags').send({});

	expect(response.statusCode).toBe(400);
});

test('POST /tags should create tag', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	const payload = {
		name: 'Tag 1',
	};

	const response = await authAgent.post('/tags').send(payload);

	expect(response.statusCode).toBe(201);

	const { id, name, createdAt, updatedAt } =
		response.body;

	expect(id).toBeDefined();
	expect(name).toBe(payload.name);
	expect(createdAt).toBeDefined();
	expect(updatedAt).toEqual(createdAt);

	// check if created tag in DB
	const tag = await Db.collections.Tag.findOne({
		where: {
			id: id,
		},
	});

	expect(tag?.name).toBe(name);
	expect(tag?.createdAt.toISOString()).toEqual(createdAt);
	expect(tag?.updatedAt.toISOString()).toEqual(updatedAt);
});

test('POST /tags should not create tag if tag with same name exists', async () => {
	const member = await testDb.createUser({ globalRole: globalMemberRole, apiKey: randomApiKey() });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	const tag = {
		name: 'Tag 1',
	};

	// create tag
	await testDb.createTag(tag);

	const response = await authAgent.post('/tags').send(tag);

	expect(response.statusCode).toBe(409);

	const { message } =
		response.body;

	expect(message).toBe("Tag already exists");
});

test('PUT /tags/:id should fail due to missing API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/tags/1`);

	expect(response.statusCode).toBe(401);
});

test('PUT /tags/:id should fail due to invalid API Key', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	owner.apiKey = 'abcXYZ';

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/tags/1`).send({});

	expect(response.statusCode).toBe(401);
});

test('PUT /tags/:id should fail due to non-existing tag', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/tags/1`).send({
		name: 'testing',
	});

	expect(response.statusCode).toBe(404);
});

test('PUT /tags/:id should fail due to invalid body', async () => {
	const owner = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const authOwnerAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: owner,
		version: 1,
	});

	const response = await authOwnerAgent.put(`/tags/1`).send({});

	expect(response.statusCode).toBe(400);
});

test('PUT /tags/:id should update tag', async () => {
	const member = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const tag = await testDb.createTag({});

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	const payload = {
		name: 'New name',
	};

	const response = await authAgent.put(`/tags/${tag.id}`).send(payload);

	const { id, name, createdAt, updatedAt } =
		response.body;

	expect(response.statusCode).toBe(200);

	expect(id).toBe(tag.id);
	expect(name).toBe(payload.name);
	expect(createdAt).toBe(tag.createdAt.toISOString());
	expect(updatedAt).not.toBe(tag.updatedAt.toISOString());

	// check updated workflow in DB
	const dbTag = await Db.collections.Tag.findOne({
		where: {
			id: id,
		},
	});

	expect(dbTag?.name).toBe(payload.name);
	expect(dbTag?.updatedAt.getTime()).toBeGreaterThan(
		tag.updatedAt.getTime(),
	);
});

test('PUT /workflows/:id should fail if there is already a tag with a the new name', async () => {
	const member = await testDb.createUser({ globalRole: globalOwnerRole, apiKey: randomApiKey() });

	const toUpdateTag = await testDb.createTag({});
	const otherTag = await testDb.createTag({ name: "Some name" });

	const authAgent = utils.createAgent(app, {
		apiPath: 'public',
		auth: true,
		user: member,
		version: 1,
	});

	const payload = {
		name: otherTag.name,
	};

	const response = await authAgent.put(`/tags/${toUpdateTag.id}`).send(payload);

	expect(response.statusCode).toBe(409);

	const { message } =
		response.body;

	expect(message).toBe("Tag already exists");

	// check tags haven't be updated in DB
	const toUpdateTagFromDb = await Db.collections.Tag.findOne({
		where: {
			id: toUpdateTag.id,
		},
	});

	expect(toUpdateTagFromDb?.name).toEqual(toUpdateTag.name);
	expect(toUpdateTagFromDb?.createdAt.toISOString()).toEqual(toUpdateTag.createdAt.toISOString());
	expect(toUpdateTagFromDb?.updatedAt.toISOString()).toEqual(toUpdateTag.updatedAt.toISOString());

	const otherTagFromDb = await Db.collections.Tag.findOne({
		where: {
			id: otherTag.id,
		},
	});

	expect(otherTagFromDb?.name).toEqual(otherTag.name);
	expect(otherTagFromDb?.createdAt.toISOString()).toEqual(otherTag.createdAt.toISOString());
	expect(otherTagFromDb?.updatedAt.toISOString()).toEqual(otherTag.updatedAt.toISOString());
});
