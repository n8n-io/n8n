import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
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

// Opt in only with a disposable repository. This journey writes Git commits to it.
describe.skipIf(!fixturePath)('GitLab provider live compatibility', () => {
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

	it('creates a validated provider, clones both directions, promotes, and applies with the existing transport', async () => {
		const fixture = fixtureSchema.parse(JSON.parse(await readFile(fixturePath ?? '', 'utf8')));
		const agent = server.publicApiAgentFor(owner);
		const provider = await agent.post('/promotions/providers').send({
			name: 'GitLab verification',
			type: 'gitlab',
			auth: { authType: 'token', username: 'n8n', password: fixture.accessToken },
			config: { schemaVersion: 1, baseUrl: fixture.baseUrl },
		});
		expect(provider.status, JSON.stringify(provider.body)).toBe(201);
		expect(JSON.stringify(provider.body)).not.toContain(fixture.accessToken);
		const connection = await agent.post('/promotions/connections').send({
			name: 'GitLab verification',
			scope: 'instance',
			providerId: provider.body.provider.id,
			target: { schemaVersion: 1, remoteUrl: `${fixture.baseUrl}/${fixture.projectPath}.git` },
			configs: {
				apply: { settings: { schemaVersion: 1, branchName: 'main' } },
				promote: {
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
				},
			},
		});
		expect(connection.status, JSON.stringify(connection.body)).toBe(201);
		const project = await createTeamProject('GitLab verification', owner);
		await createWorkflow({ name: 'GitLab verification', nodes: [], connections: {} }, project);
		const root = `/promotions/connections/${connection.body.id}`;
		try {
			for (const direction of ['promote', 'apply']) {
				const clone = await agent.post(`${root}/${direction}/clone`);
				expect(clone.status, JSON.stringify(clone.body)).toBe(200);
				expect(clone.body.hasCheckout).toBe(true);
			}
			const promoted = await agent
				.post(`${root}/promote`)
				.send({ commitMessage: 'Verify GitLab provider compatibility' });
			expect(promoted.status, JSON.stringify(promoted.body)).toBe(200);
			expect(promoted.body.counts.workflows).toBeGreaterThan(0);
			expect(promoted.body.git.branchName).toBe('main');
			const applied = await agent.post(`${root}/apply`).send({
				expectedSource: {
					configId: connection.body.configs.apply.id,
					branchName: 'main',
					commitSha: promoted.body.git.commitSha,
				},
			});
			expect(applied.status, JSON.stringify(applied.body)).toBe(200);
			expect(applied.body).toMatchObject({
				status: 'applied',
				git: { commitSha: promoted.body.git.commitSha },
			});
		} finally {
			await agent.delete(root);
			await agent.delete(`/promotions/providers/${provider.body.provider.id}`);
		}
	}, 60_000);
});
