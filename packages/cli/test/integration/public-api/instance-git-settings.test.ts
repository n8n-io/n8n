import { testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY } from '@/modules/git-connections.ee/constants';
import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Instance Git settings in Public API', () => {
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
		await Container.get(SettingsRepository).delete({
			key: INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
		});
		owner = await createOwnerWithApiKey();
	});

	it('returns a disabled, empty connection before it is ever configured', async () => {
		const response = await testServer.publicApiAgentFor(owner).get('/instance-git-settings');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			enabled: false,
			repositoryUrl: null,
			branchName: null,
			connectionType: null,
			publicKey: null,
			keyGeneratorType: null,
			baseCommit: null,
			createdAt: null,
			updatedAt: null,
		});
	});

	it('configures, reads back, and disables an HTTPS connection', async () => {
		const agent = testServer.publicApiAgentFor(owner);
		const updateResponse = await agent.put('/instance-git-settings').send({
			enabled: true,
			repositoryUrl: 'https://example.com/org/repo.git',
			branchName: 'main',
			connectionType: 'https',
			username: 'git-user',
			password: 'secret',
		});

		expect(updateResponse.status, JSON.stringify(updateResponse.body)).toBe(200);
		expect(updateResponse.body).toMatchObject({
			enabled: true,
			repositoryUrl: 'https://example.com/org/repo.git',
			branchName: 'main',
			connectionType: 'https',
			publicKey: null,
		});
		expect(updateResponse.body).not.toHaveProperty('username');
		expect(updateResponse.body).not.toHaveProperty('password');
		expect(updateResponse.body).not.toHaveProperty('encryptedUsername');
		expect(updateResponse.body).not.toHaveProperty('encryptedPassword');

		const getResponse = await agent.get('/instance-git-settings');
		expect(getResponse.status).toBe(200);
		expect(getResponse.body).toMatchObject({ enabled: true, connectionType: 'https' });

		const stored = await Container.get(SettingsRepository).findByKey(
			INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
		);
		const preferences = JSON.parse(stored!.value) as Record<string, unknown>;
		expect(preferences.encryptedUsername).toBeTruthy();
		expect(preferences.encryptedUsername).not.toBe('git-user');
		expect(preferences.encryptedPassword).toBeTruthy();
		expect(preferences.encryptedPassword).not.toBe('secret');

		const disableResponse = await agent.put('/instance-git-settings').send({ enabled: false });
		expect(disableResponse.status).toBe(200);
		expect(disableResponse.body).toMatchObject({
			enabled: false,
			repositoryUrl: 'https://example.com/org/repo.git',
			connectionType: 'https',
		});
	});

	it('generates an SSH key pair without exposing the private key', async () => {
		const response = await testServer.publicApiAgentFor(owner).put('/instance-git-settings').send({
			repositoryUrl: 'git@example.com:org/repo.git',
			connectionType: 'ssh',
		});

		expect(response.status).toBe(200);
		expect(response.body.publicKey).toMatch(/^ssh-ed25519 /);
		expect(response.body.keyGeneratorType).toBe('ed25519');
		expect(response.body).not.toHaveProperty('privateKey');
		expect(response.body).not.toHaveProperty('encryptedPrivateKey');
	});

	it('rejects enabling without a configured connection', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/instance-git-settings')
			.send({ enabled: true });

		expect(response.status).toBe(400);
	});

	it('rejects a repository URL without a connection type', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/instance-git-settings')
			.send({ repositoryUrl: 'https://example.com/org/repo.git' });

		expect(response.status).toBe(400);

		const stored = await Container.get(SettingsRepository).findByKey(
			INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
		);
		expect(stored).toBeNull();
	});

	it('rejects an empty body', async () => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/instance-git-settings')
			.send({});

		expect(response.status).toBe(400);
	});

	it('rejects a key without the git-connection scope', async () => {
		const unscopedOwner = await createOwnerWithApiKey({ scopes: ['tag:list'] });
		const response = await testServer
			.publicApiAgentFor(unscopedOwner)
			.get('/instance-git-settings');
		expect(response.status).toBe(403);
	});

	it('rejects requests when Git connections is not licensed', async () => {
		testServer.license.disable('feat:gitConnections');
		const response = await testServer.publicApiAgentFor(owner).get('/instance-git-settings');
		expect(response.status).toBe(403);
	});
});
