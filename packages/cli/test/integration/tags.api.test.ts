import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import type { Test } from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import { TagRepository } from '@db/repositories/tag.repository';
import Container from 'typedi';
import { createUserShell } from './shared/db/users';

let authOwnerAgent: TestAgent<Test>;
const testServer = utils.setupTestServer({ endpointGroups: ['tags'] });

beforeAll(async () => {
	const ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['Tag']);
});

describe('POST /tags', () => {
	test('should create tag', async () => {
		const resp = await authOwnerAgent.post('/tags').send({ name: 'test' });
		expect(resp.statusCode).toBe(200);

		const dbTag = await Container.get(TagRepository).findBy({ name: 'test' });
		expect(dbTag.length === 1);
	});

	test('should not create duplicate tag', async () => {
		const newTag = Container.get(TagRepository).create({ name: 'test' });
		await Container.get(TagRepository).save(newTag);

		const resp = await authOwnerAgent.post('/tags').send({ name: 'test' });
		expect(resp.status).toBe(500);

		const dbTag = await Container.get(TagRepository).findBy({ name: 'test' });
		expect(dbTag.length).toBe(1);
	});
});
