import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { TagRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createTag } from '../shared/db/tags';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
});

beforeEach(async () => {
	await testDb.truncate(['TagEntity']);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/tags', 'abcXYZ'));

	test('should return all tags', async () => {
		await Promise.all([createTag({}), createTag({}), createTag({})]);

		const response = await authMemberAgent.get('/tags');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		expect(response.body.nextCursor).toBeNull();

		for (const tag of response.body.data) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});

	test('should return all tags with pagination', async () => {
		await Promise.all([createTag({}), createTag({}), createTag({})]);

		const response = await authMemberAgent.get('/tags?limit=1');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		expect(response.body.nextCursor).not.toBeNull();

		const response2 = await authMemberAgent.get(`/tags?limit=1&cursor=${response.body.nextCursor}`);

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data.length).toBe(1);
		expect(response2.body.nextCursor).not.toBeNull();
		expect(response2.body.nextCursor).not.toBe(response.body.nextCursor);

		const responses = [...response.body.data, ...response2.body.data];

		for (const tag of responses) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}

		// check that we really received a different result
		expect(response.body.data[0].id).not.toBe(response2.body.data[0].id);
	});
});

describe('GET /tags/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/tags/gZqmqiGAuo1dHT7q', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', '/tags/gZqmqiGAuo1dHT7q', 'abcXYZ'),
	);

	test('should fail due to non-existing tag', async () => {
		const response = await authOwnerAgent.get('/tags/gZqmqiGAuo1dHT7q');

		expect(response.statusCode).toBe(404);
	});

	test('should retrieve tag', async () => {
		// create tag
		const tag = await createTag({});

		const response = await authMemberAgent.get(`/tags/${tag.id}`);

		expect(response.statusCode).toBe(200);

		const { id, name, createdAt, updatedAt } = response.body;

		expect(id).toEqual(tag.id);
		expect(name).toEqual(tag.name);
		expect(createdAt).toEqual(tag.createdAt.toISOString());
		expect(updatedAt).toEqual(tag.updatedAt.toISOString());
	});
});

describe('DELETE /tags/:id', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('delete', '/tags/gZqmqiGAuo1dHT7q', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('delete', '/tags/gZqmqiGAuo1dHT7q', 'abcXYZ'),
	);

	test('should fail due to non-existing tag', async () => {
		const response = await authOwnerAgent.delete('/tags/gZqmqiGAuo1dHT7q');

		expect(response.statusCode).toBe(404);
	});

	test('owner should delete the tag', async () => {
		// create tag
		const tag = await createTag({});

		const response = await authOwnerAgent.delete(`/tags/${tag.id}`);

		expect(response.statusCode).toBe(200);

		const { id, name, createdAt, updatedAt } = response.body;

		expect(id).toEqual(tag.id);
		expect(name).toEqual(tag.name);
		expect(createdAt).toEqual(tag.createdAt.toISOString());
		expect(updatedAt).toEqual(tag.updatedAt.toISOString());

		// make sure the tag actually deleted from the db
		const deletedTag = await Container.get(TagRepository).findOneBy({
			id: tag.id,
		});

		expect(deletedTag).toBeNull();
	});

	test('non-owner should not delete tag', async () => {
		// create tag
		const tag = await createTag({});

		const response = await authMemberAgent.delete(`/tags/${tag.id}`);

		expect(response.statusCode).toBe(403);

		const { message } = response.body;

		expect(message).toEqual('Forbidden');

		// make sure the tag was not deleted from the db
		const notDeletedTag = await Container.get(TagRepository).findOneBy({
			id: tag.id,
		});

		expect(notDeletedTag).not.toBeNull();
	});
});

describe('POST /tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('post', '/tags', 'abcXYZ'));

	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.post('/tags').send({});

		expect(response.statusCode).toBe(400);
	});

	test('should create tag', async () => {
		const payload = {
			name: 'Tag 1',
		};

		const response = await authMemberAgent.post('/tags').send(payload);

		expect(response.statusCode).toBe(201);

		const { id, name, createdAt, updatedAt } = response.body;

		expect(id).toBeDefined();
		expect(name).toBe(payload.name);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toEqual(createdAt);

		// check if created tag in DB
		const tag = await Container.get(TagRepository).findOne({
			where: {
				id,
			},
		});

		expect(tag?.name).toBe(name);
		expect(tag?.createdAt.toISOString()).toEqual(createdAt);
		expect(tag?.updatedAt.toISOString()).toEqual(updatedAt);
	});

	test('should not create tag if tag with same name exists', async () => {
		const tag = {
			name: 'Tag 1',
		};

		// create tag
		await createTag(tag);

		const response = await authMemberAgent.post('/tags').send(tag);

		expect(response.statusCode).toBe(409);

		const { message } = response.body;

		expect(message).toBe('Tag already exists');
	});
});

describe('PUT /tags/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/tags/gZqmqiGAuo1dHT7q', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('put', '/tags/gZqmqiGAuo1dHT7q', 'abcXYZ'),
	);

	test('should fail due to non-existing tag', async () => {
		const response = await authOwnerAgent.put('/tags/gZqmqiGAuo1dHT7q').send({
			name: 'testing',
		});

		expect(response.statusCode).toBe(404);
	});

	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.put('/tags/gZqmqiGAuo1dHT7q').send({});

		expect(response.statusCode).toBe(400);
	});

	test('should update tag', async () => {
		const tag = await createTag({});

		const payload = {
			name: 'New name',
		};

		const response = await authOwnerAgent.put(`/tags/${tag.id}`).send(payload);

		const { id, name, updatedAt } = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(tag.id);
		expect(name).toBe(payload.name);
		expect(updatedAt).not.toBe(tag.updatedAt.toISOString());

		// check updated tag in DB
		const dbTag = await Container.get(TagRepository).findOne({
			where: {
				id,
			},
		});

		expect(dbTag?.name).toBe(payload.name);
		expect(dbTag?.updatedAt.getTime()).toBeGreaterThan(tag.updatedAt.getTime());
	});

	test('should fail if there is already a tag with a the new name', async () => {
		const toUpdateTag = await createTag({});
		const otherTag = await createTag({ name: 'Some name' });

		const payload = {
			name: otherTag.name,
		};

		const response = await authOwnerAgent.put(`/tags/${toUpdateTag.id}`).send(payload);

		expect(response.statusCode).toBe(409);

		const { message } = response.body;

		expect(message).toBe('Tag already exists');

		// check tags haven't be updated in DB
		const toUpdateTagFromDb = await Container.get(TagRepository).findOne({
			where: {
				id: toUpdateTag.id,
			},
		});

		expect(toUpdateTagFromDb?.name).toEqual(toUpdateTag.name);
		expect(toUpdateTagFromDb?.createdAt.toISOString()).toEqual(toUpdateTag.createdAt.toISOString());
		expect(toUpdateTagFromDb?.updatedAt.toISOString()).toEqual(toUpdateTag.updatedAt.toISOString());

		const otherTagFromDb = await Container.get(TagRepository).findOne({
			where: {
				id: otherTag.id,
			},
		});

		expect(otherTagFromDb?.name).toEqual(otherTag.name);
		expect(otherTagFromDb?.createdAt.toISOString()).toEqual(otherTag.createdAt.toISOString());
		expect(otherTagFromDb?.updatedAt.toISOString()).toEqual(otherTag.updatedAt.toISOString());
	});
});
