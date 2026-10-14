import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';
import { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';

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
		let connectionId: string | undefined;
		try {
			const target = {
				schemaVersion: 1,
				remoteUrl: `${baseUrl.replace(/\/$/, '')}/${fixture.projectPath}.git`,
			};
			const connection = await agent.post('/promotions/connections').send({
				name: 'GitLab repository identity verification',
				scope: 'projects',
				providerId: created.body.provider.id,
				target,
			});
			expect(connection.status, JSON.stringify(connection.body)).toBe(201);
			connectionId = z.string().parse(connection.body.id);
			const publicTarget = { ...target, repositoryPath: fixture.projectPath };
			expect(connection.body.target).toEqual(publicTarget);
			expect(
				(await Container.get(PromotionConnectionRepository).findByIdWithProvider(connectionId))
					?.target,
			).toEqual({ schemaVersion: 1, repositoryPath: fixture.projectPath });
			const saved = await agent.get(`/promotions/connections/${connectionId}`);
			expect(saved.status).toBe(200);
			expect(saved.body.target).toEqual(publicTarget);

			const branches = await agent.get(
				`${root}/repositories/${encodeURIComponent(saved.body.target.repositoryPath)}/branches`,
			);
			expect(branches.status, JSON.stringify(branches.body)).toBe(200);
			expect(branches.body.data).toContainEqual(expect.objectContaining({ isDefault: true }));
			expect(JSON.stringify(branches.body)).not.toContain(fixture.accessToken);
		} finally {
			if (connectionId) {
				expect((await agent.delete(`/promotions/connections/${connectionId}`)).status).toBe(204);
			}
			expect((await agent.delete(root)).status).toBe(204);
		}
	}, 60_000);
});
