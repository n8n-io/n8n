import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { AnnotationTagRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createAnnotationTags, createSuccessfulExecution } from '../shared/db/executions';
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
	await testDb.truncate(['AnnotationTagEntity']);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

const testWithAPIKey = (method: 'get' | 'post', url: string, apiKey: string | null) => async () => {
	void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
	const response = await authOwnerAgent[method](url);
	expect(response.statusCode).toBe(401);
};

describe('GET /annotation-tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/annotation-tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/annotation-tags', 'abcXYZ'));

	test('should fail due to missing "annotationTag:list" scope', async () => {
		const memberWithoutScope = await createMemberWithApiKey({ scopes: ['annotationTag:create'] });

		const response = await testServer.publicApiAgentFor(memberWithoutScope).get('/annotation-tags');

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('Forbidden');
	});

	test('should return an empty list when no annotation tags exist', async () => {
		const response = await authMemberAgent.get('/annotation-tags');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual([]);
		expect(response.body.nextCursor).toBeNull();
	});

	test('should return all annotation tags', async () => {
		await createAnnotationTags(['Tag 1', 'Tag 2', 'Tag 3']);

		const response = await authMemberAgent.get('/annotation-tags');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(3);
		expect(response.body.nextCursor).toBeNull();

		for (const tag of response.body.data) {
			expect(Object.keys(tag).sort()).toEqual(['createdAt', 'id', 'name', 'updatedAt']);
		}
	});

	test('should return annotation tags with pagination', async () => {
		await createAnnotationTags(['Tag 1', 'Tag 2', 'Tag 3']);

		const response = await authMemberAgent.get('/annotation-tags?limit=1');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.nextCursor).not.toBeNull();

		const response2 = await authMemberAgent.get(
			`/annotation-tags?limit=1&cursor=${response.body.nextCursor}`,
		);

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data).toHaveLength(1);
		expect(response2.body.nextCursor).not.toBeNull();
		expect(response2.body.data[0].id).not.toBe(response.body.data[0].id);
	});
});

describe('POST /annotation-tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/annotation-tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('post', '/annotation-tags', 'abcXYZ'));

	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.post('/annotation-tags').send({});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe("request/body must have required property 'name'");
	});

	test('should fail due to non-string name', async () => {
		const response = await authOwnerAgent.post('/annotation-tags').send({ name: 42 });

		expect(response.statusCode).toBe(400);
	});

	test.each(['id', 'createdAt', 'updatedAt'])(
		'should fail due to read-only property %s in body',
		async (key) => {
			const response = await authOwnerAgent
				.post('/annotation-tags')
				.send({ name: 'Tag 1', [key]: '2tUt1wbLX592XDdX' });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe(`request/body/${key} is read-only`);
		},
	);

	test('should fail due to a name longer than 24 characters', async () => {
		const response = await authOwnerAgent.post('/annotation-tags').send({ name: 'a'.repeat(25) });

		expect(response.statusCode).toBe(400);
		expect(await Container.get(AnnotationTagRepository).count()).toBe(0);
	});

	test('should fail due to missing "annotationTag:create" scope', async () => {
		const memberWithoutScope = await createMemberWithApiKey({ scopes: ['annotationTag:list'] });

		const response = await testServer
			.publicApiAgentFor(memberWithoutScope)
			.post('/annotation-tags')
			.send({ name: 'Tag 1' });

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('Forbidden');
		expect(await Container.get(AnnotationTagRepository).findOneBy({ name: 'Tag 1' })).toBeNull();
	});

	test('should create an annotation tag', async () => {
		const response = await authMemberAgent.post('/annotation-tags').send({ name: 'API-123' });

		expect(response.statusCode).toBe(201);
		expect(Object.keys(response.body).sort()).toEqual(['createdAt', 'id', 'name', 'updatedAt']);

		const { id, name, createdAt, updatedAt } = response.body;

		expect(name).toBe('API-123');

		const tag = await Container.get(AnnotationTagRepository).findOneBy({ id });

		expect(tag?.name).toBe(name);
		expect(tag?.createdAt.toISOString()).toEqual(createdAt);
		expect(tag?.updatedAt.toISOString()).toEqual(updatedAt);
	});

	test('should not create an annotation tag if one with the same name exists', async () => {
		await createAnnotationTags(['Tag 1']);

		const response = await authMemberAgent.post('/annotation-tags').send({ name: 'Tag 1' });

		expect(response.statusCode).toBe(409);
		expect(response.body.message).toBe('Tag already exists');
	});

	test('should allow assigning a created annotation tag to an execution', async () => {
		const created = await authOwnerAgent.post('/annotation-tags').send({ name: 'API-123' });
		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent
			.put(`/executions/${execution.id}/tags`)
			.send([{ id: created.body.id }]);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual([expect.objectContaining({ id: created.body.id, name: 'API-123' })]);
	});
});
