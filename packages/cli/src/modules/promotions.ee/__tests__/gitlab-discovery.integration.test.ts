import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const fixturePath = process.env.GITLAB_TEST_CONFIG;
const fixtureSchema = z.object({
	baseUrl: z.string().url(),
	projectPath: z.string().min(1),
	accessToken: z.string().min(1),
});

// This opt-in check only reads GitLab. It creates a provider in the test database.
describe.skipIf(!fixturePath)('GitLab discovery live compatibility', () => {
	const server = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:gitConnections'],
		modules: ['promotions'],
	});
	let owner: User;

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwnerWithApiKey();
	});

	it('finds the fixture repository and its default branch without a connection', async () => {
		const fixture = fixtureSchema.parse(JSON.parse(await readFile(fixturePath ?? '', 'utf8')));
		const baseUrl = process.env.GITLAB_TEST_BASE_URL ?? fixture.baseUrl;
		const agent = server.publicApiAgentFor(owner);
		const created = await agent.post('/promotions/providers').send({
			name: 'GitLab discovery verification',
			type: 'gitlab',
			auth: { authType: 'token', username: 'n8n', password: fixture.accessToken },
			config: { schemaVersion: 1, baseUrl },
		});
		expect(created.status, JSON.stringify(created.body)).toBe(201);
		const root = `/promotions/providers/${created.body.provider.id}`;
		try {
			const repositories = await agent
				.get(`${root}/repositories`)
				.query({ search: fixture.projectPath, limit: 1 });
			expect(repositories.status, JSON.stringify(repositories.body)).toBe(200);
			expect(repositories.body.data).toHaveLength(1);
			const repository = repositories.body.data[0];
			expect(repository.fullPath).toBe(fixture.projectPath);
			expect(repository.defaultBranch).toBeTruthy();
			expect(repository.remoteUrl).toMatch(/^https?:\/\//);
			expect(JSON.stringify(repositories.body)).not.toContain(fixture.accessToken);

			const branches = await agent
				.get(`${root}/repositories/${repository.id}/branches`)
				.query({ search: repository.defaultBranch, limit: 50 });
			expect(branches.status, JSON.stringify(branches.body)).toBe(200);
			expect(branches.body.data).toContainEqual({
				name: repository.defaultBranch,
				isDefault: true,
			});
			expect(JSON.stringify(branches.body)).not.toContain(fixture.accessToken);
		} finally {
			expect((await agent.delete(root)).status).toBe(204);
		}
	}, 60_000);
});
