import { testDb } from '@n8n/backend-test-utils';
import { TagRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['tags'] });

beforeAll(async () => {
	const ownerShell = await createUserShell('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(async () => {
	await testDb.truncate(['TagEntity']);
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

	test('should delete tag', async () => {
		const newTag = Container.get(TagRepository).create({ name: 'test' });
		await Container.get(TagRepository).save(newTag);

		const resp = await authOwnerAgent.delete(`/tags/${newTag.id}`);
		expect(resp.status).toBe(200);

		const dbTag = await Container.get(TagRepository).findBy({ name: 'test' });
		expect(dbTag.length).toBe(0);
	});

	test('should update tag name', async () => {
		const newTag = Container.get(TagRepository).create({ name: 'test' });
		await Container.get(TagRepository).save(newTag);

		const resp = await authOwnerAgent.patch(`/tags/${newTag.id}`).send({ name: 'updated' });
		expect(resp.status).toBe(200);

		const dbTag = await Container.get(TagRepository).findBy({ name: 'updated' });
		expect(dbTag.length).toBe(1);
	});

	test('should retrieve all tags', async () => {
		const newTag = Container.get(TagRepository).create({ name: 'test' });
		const savedTag = await Container.get(TagRepository).save(newTag);

		const resp = await authOwnerAgent.get('/tags');
		expect(resp.status).toBe(200);

		expect(resp.body.data.length).toBe(1);
		expect(resp.body.data[0]).toMatchObject({
			id: savedTag.id,
			name: savedTag.name,
			createdAt: savedTag.createdAt.toISOString(),
			updatedAt: savedTag.updatedAt.toISOString(),
		});
	});

	test('should retrieve all tags with with usage count', async () => {
		const newTag = Container.get(TagRepository).create({ name: 'test' });
		const savedTag = await Container.get(TagRepository).save(newTag);

		const resp = await authOwnerAgent.get('/tags').query({ withUsageCount: 'true' });
		expect(resp.status).toBe(200);

		expect(resp.body.data.length).toBe(1);
		expect(resp.body.data[0]).toMatchObject({
			id: savedTag.id,
			name: savedTag.name,
			createdAt: savedTag.createdAt.toISOString(),
			updatedAt: savedTag.updatedAt.toISOString(),
			usageCount: 0,
		});
	});
});
