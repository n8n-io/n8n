import { PromotionRepositoryListPublicDto, type PromotionRepository } from '@n8n/api-types';
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

// This opt-in check only reads GitLab. It creates records in the test database.
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

	it('discovers the fixture before creating a connection and saves its repository ID', async () => {
		const fixture = fixtureSchema.parse(JSON.parse(await readFile(fixturePath ?? '', 'utf8')));
		const baseUrl = process.env.GITLAB_TEST_BASE_URL ?? fixture.baseUrl;
		const agent = server.publicApiAgentFor(owner);
		const created = await agent.post('/promotions/providers').send({
			name: 'GitLab discovery verification',
			type: 'gitlab',
			auth: { authType: 'token', password: fixture.accessToken },
			config: { schemaVersion: 1, baseUrl },
		});
		expect(created.status, JSON.stringify(created.body)).toBe(201);
		const root = `/promotions/providers/${created.body.provider.id}`;
		let connectionId: string | undefined;
		try {
			let repository: PromotionRepository | undefined;
			let cursor: string | undefined;
			do {
				const repositories = await agent
					.get(`${root}/repositories`)
					.query({ search: fixture.projectPath, ...(cursor && { cursor }) });
				expect(repositories.status, JSON.stringify(repositories.body)).toBe(200);
				expect(JSON.stringify(repositories.body)).not.toContain(fixture.accessToken);
				const page = PromotionRepositoryListPublicDto.parse(repositories.body);
				repository = page.data.find((item) => item.fullPath === fixture.projectPath);
				cursor = page.nextCursor ?? undefined;
			} while (!repository && cursor);
			expect(repository, 'The fixture repository must appear in discovery.').toBeDefined();
			if (!repository) throw new Error('Fixture repository not found.');
			expect(repository.defaultBranch).toBeTruthy();
			expect(repository.remoteUrl).toMatch(/^https?:\/\//);
			const target = {
				schemaVersion: 1,
				remoteUrl: repository.remoteUrl,
				repositoryId: repository.id,
			};
			const connection = await agent.post('/promotions/connections').send({
				name: 'GitLab repository identity verification',
				scope: 'projects',
				providerId: created.body.provider.id,
				target,
			});
			expect(connection.status, JSON.stringify(connection.body)).toBe(201);
			connectionId = connection.body.id;
			expect(connection.body.target).toEqual(target);
			const saved = await agent.get(`/promotions/connections/${connectionId}`);
			expect(saved.status).toBe(200);
			expect(saved.body.target).toEqual(target);

			const branches = await agent
				.get(`${root}/repositories/${repository.id}/branches`)
				.query({ search: repository.defaultBranch });
			expect(branches.status, JSON.stringify(branches.body)).toBe(200);
			expect(branches.body.data).toContainEqual({
				name: repository.defaultBranch,
				isDefault: true,
			});
			expect(JSON.stringify(branches.body)).not.toContain(fixture.accessToken);
		} finally {
			if (connectionId) {
				expect((await agent.delete(`/promotions/connections/${connectionId}`)).status).toBe(204);
			}
			expect((await agent.delete(root)).status).toBe(204);
		}
	}, 60_000);
});
