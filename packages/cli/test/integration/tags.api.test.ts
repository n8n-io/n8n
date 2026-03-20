import { testDb } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, TagRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { SourceControlPreferences } from '@/modules/source-control.ee/types/source-control-preferences';

import { createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['tags'] });

beforeAll(async () => {
	const ownerShell = await createUserShell(GLOBAL_OWNER_ROLE);
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

describe('Source Control read-only mode', () => {
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let originalPreferences: SourceControlPreferences;

	beforeAll(async () => {
		sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
		originalPreferences = sourceControlPreferencesService.getPreferences();
		await sourceControlPreferencesService.setPreferences({
			connected: true,
			keyGeneratorType: 'rsa',
			branchReadOnly: true,
		});
	});

	afterAll(async () => {
		await sourceControlPreferencesService.setPreferences(originalPreferences);
	});

	describe('mutating endpoints should return 403', () => {
		test('POST /tags should fail', async () => {
			const response = await authOwnerAgent.post('/tags').send({ name: 'test' }).expect(403);

			expect(response.body.message).toContain('read-only mode');
		});

		test('PATCH /tags/:id should fail', async () => {
			const newTag = Container.get(TagRepository).create({ name: 'test' });
			const savedTag = await Container.get(TagRepository).save(newTag);

			const response = await authOwnerAgent
				.patch(`/tags/${savedTag.id}`)
				.send({ name: 'updated' })
				.expect(403);

			expect(response.body.message).toContain('read-only mode');
		});

		test('DELETE /tags/:id should fail', async () => {
			const newTag = Container.get(TagRepository).create({ name: 'test' });
			const savedTag = await Container.get(TagRepository).save(newTag);

			const response = await authOwnerAgent.delete(`/tags/${savedTag.id}`).expect(403);

			expect(response.body.message).toContain('read-only mode');
		});
	});

	describe('read-only endpoints should still work', () => {
		test('GET /tags should work', async () => {
			await authOwnerAgent.get('/tags').expect(200);
		});
	});
});
