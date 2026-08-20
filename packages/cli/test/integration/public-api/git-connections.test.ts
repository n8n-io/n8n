import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { GitConnectionRepository } from '@/modules/git-connections.ee/database/repositories/git-connection.repository';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Git connections in Public API', () => {
	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:gitConnections'],
		modules: ['git-connections'],
	});
	let owner: User;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		testServer.license.reset();
		await Container.get(GitConnectionRepository).delete({});
		owner = await createOwnerWithApiKey();
	});

	it('creates, retrieves, lists, updates, disconnects, and deletes an HTTPS connection', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const createResponse = await agent.post('/git-connections').send({
			name: 'Deployments',
			repositoryUrl: 'https://example.com/org/repo.git',
			branchName: 'main',
			connectionType: 'https',
			username: 'git-user',
			password: 'secret',
		});

		expect(createResponse.status).toBe(201);
		expect(createResponse.body).toMatchObject({
			name: 'Deployments',
			branchName: 'main',
			connectionType: 'https',
			publicKey: null,
		});
		expect(createResponse.body).not.toHaveProperty('username');
		expect(createResponse.body).not.toHaveProperty('password');
		expect(createResponse.body).not.toHaveProperty('connected');
		const id = createResponse.body.id as string;

		const getResponse = await agent.get(`/git-connections/${id}`);
		expect(getResponse.status).toBe(200);
		expect(getResponse.body.id).toBe(id);

		const listResponse = await agent.get('/git-connections?limit=1');
		expect(listResponse.status).toBe(200);
		expect(listResponse.body.data).toHaveLength(1);
		expect(listResponse.body.data[0]).not.toHaveProperty('publicKey');

		const updateResponse = await agent.put(`/git-connections/${id}`).send({ name: 'Renamed' });
		expect(updateResponse.status, JSON.stringify(updateResponse.body)).toBe(200);
		expect(updateResponse.body.name).toBe('Renamed');

		const disconnectResponse = await agent.post(`/git-connections/${id}/disconnect`);
		expect(disconnectResponse.status).toBe(200);
		expect(disconnectResponse.body.id).toBe(id);
		expect(disconnectResponse.body).not.toHaveProperty('connected');

		const deleteResponse = await agent.delete(`/git-connections/${id}`);
		expect(deleteResponse.status).toBe(204);
		expect(await Container.get(GitConnectionRepository).findOneBy({ id })).toBeNull();
	});

	it('rejects a key without the source-control scope', async () => {
		const unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
		const response = await testServer.publicApiAgentFor(unscopedOwner).get('/git-connections');
		expect(response.status).toBe(403);
	});

	it('rejects requests when Git connections is not licensed', async () => {
		testServer.license.disable('feat:gitConnections');
		const response = await testServer.publicApiAgentFor(owner).get('/git-connections');
		expect(response.status).toBe(403);
	});

	it('generates an SSH key pair without exposing the private key', async () => {
		const response = await testServer.publicApiAgentFor(owner).post('/git-connections').send({
			name: 'SSH repository',
			repositoryUrl: 'git@example.com:org/repo.git',
			connectionType: 'ssh',
		});

		expect(response.status).toBe(201);
		expect(response.body.publicKey).toMatch(/^ssh-ed25519 /);
		expect(response.body.keyGeneratorType).toBe('ed25519');
		expect(response.body).not.toHaveProperty('privateKey');
		const entity = await Container.get(GitConnectionRepository).findOneByOrFail({
			id: response.body.id,
		});
		expect(entity.encryptedPrivateKey).toBeTruthy();
		expect(entity.encryptedUsername).toBeNull();
		expect(entity.encryptedPassword).toBeNull();
	});

	it('rejects replacing only one HTTPS credential and leaves the entity unchanged', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const created = await agent.post('/git-connections').send({
			name: 'HTTPS repository',
			repositoryUrl: 'https://example.com/org/repo.git',
			connectionType: 'https',
			username: 'git-user',
			password: 'secret',
		});
		const before = await Container.get(GitConnectionRepository).findOneByOrFail({
			id: created.body.id,
		});

		const response = await agent
			.put(`/git-connections/${created.body.id}`)
			.send({ username: 'replacement' });

		expect(response.status).toBe(400);
		const after = await Container.get(GitConnectionRepository).findOneByOrFail({
			id: created.body.id,
		});
		expect(after.encryptedUsername).toBe(before.encryptedUsername);
		expect(after.encryptedPassword).toBe(before.encryptedPassword);
	});

	it('rejects mismatched URL and authentication types without persisting', async () => {
		const response = await testServer.publicApiAgentFor(owner).post('/git-connections').send({
			name: 'Invalid',
			repositoryUrl: 'git@example.com:org/repo.git',
			connectionType: 'https',
			username: 'git-user',
			password: 'secret',
		});
		expect(response.status).toBe(400);
		expect(await Container.get(GitConnectionRepository).count()).toBe(0);
	});
});
