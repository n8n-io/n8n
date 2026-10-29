import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';
import { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';

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
		enabledFeatures: ['feat:promotions'],
		modules: ['promotions'],
	});
	let owner: User;

	beforeAll(async () => {
		await testDb.init();
		owner = await createOwnerWithApiKey();
	});

	it('saves the fixture path and lists its branches with it', async () => {
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
		let environmentId: string | undefined;
		try {
			const remote = {
				schemaVersion: 1,
				remoteUrl: `${baseUrl.replace(/\/$/, '')}/${fixture.projectPath}.git`,
			};
			const environment = await agent.post('/promotions/environments').send({
				name: 'GitLab repository identity verification',
				scope: 'projects',
				providerId: created.body.provider.id,
				remote,
				direction: 'apply',
				settings: { schemaVersion: 1, branchName: 'main' },
			});
			expect(environment.status, JSON.stringify(environment.body)).toBe(201);
			environmentId = z.string().parse(environment.body.id);
			const publicRemote = { ...remote, repositoryPath: fixture.projectPath };
			expect(environment.body.remote).toEqual(publicRemote);
			expect(
				(await Container.get(PromotionEnvironmentRepository).findByIdWithProvider(environmentId))
					?.remote,
			).toEqual({ schemaVersion: 1, repositoryPath: fixture.projectPath });
			const saved = await agent.get(`/promotions/environments/${environmentId}`);
			expect(saved.status).toBe(200);
			expect(saved.body.remote).toEqual(publicRemote);

			const branches = await agent.get(
				`${root}/repositories/${encodeURIComponent(saved.body.remote.repositoryPath)}/branches`,
			);
			expect(branches.status, JSON.stringify(branches.body)).toBe(200);
			expect(branches.body.data).toContainEqual(expect.objectContaining({ isDefault: true }));
			expect(JSON.stringify(branches.body)).not.toContain(fixture.accessToken);
		} finally {
			if (environmentId) {
				expect((await agent.delete(`/promotions/environments/${environmentId}`)).status).toBe(204);
			}
			expect((await agent.delete(root)).status).toBe(204);
		}
	}, 60_000);
});
