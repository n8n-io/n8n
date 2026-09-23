import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ProjectRepository } from '@n8n/db';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';

import { ExternalSecretsConfigFileLoader } from '../external-secrets-config-file-loader';

describe('ExternalSecretsConfigFileLoader', () => {
	let dir: string;
	let projectRepository: ReturnType<typeof mock<ProjectRepository>>;

	beforeEach(() => {
		// Reset so `Container.get(ExternalSecretsConfigFileLoader)` below rebuilds the singleton
		// with each test's own mocks, instead of reusing an instance built by an earlier test.
		Container.reset();

		dir = mkdtempSync(join(tmpdir(), 'n8n-config-loader-test-'));
		projectRepository = mock<ProjectRepository>();
		Container.set(ProjectRepository, projectRepository);

		const providers = new ExternalSecretsProviders();
		Container.set(ExternalSecretsProviders, providers);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	function writeConfigFile(content: unknown) {
		const filePath = join(dir, 'config.json');
		writeFileSync(filePath, JSON.stringify(content));
		return filePath;
	}

	test('loads and resolves a valid file', async () => {
		projectRepository.findOne.mockResolvedValue({ id: 'project-1' } as never);
		const filePath = writeConfigFile({
			connections: [
				{
					key: 'vaultProd',
					type: 'vault',
					projectIds: ['project-1'],
					settings: { url: 'https://vault.example.com', authMethod: 'appRole', roleId: 'abc' },
				},
			],
		});

		const loader = Container.get(ExternalSecretsConfigFileLoader);
		const loaded = await loader.load(filePath);

		expect(loaded).toEqual([
			{
				key: 'vaultProd',
				type: 'vault',
				isEnabled: true,
				projectIds: ['project-1'],
				settings: { url: 'https://vault.example.com', authMethod: 'appRole', roleId: 'abc' },
			},
		]);
	});

	test('throws on malformed JSON naming the file path', async () => {
		const filePath = join(dir, 'broken.json');
		writeFileSync(filePath, '{ not valid json');

		const loader = Container.get(ExternalSecretsConfigFileLoader);

		await expect(loader.load(filePath)).rejects.toThrow(filePath);
	});

	test('aggregates errors from multiple invalid entries', async () => {
		const filePath = writeConfigFile({
			connections: [
				{ key: 'unknownType', type: 'notARealProvider', settings: {} },
				{ key: 'missingProject', type: 'vault', projectIds: ['does-not-exist'], settings: {} },
			],
		});
		projectRepository.findOne.mockResolvedValue(null);

		const loader = Container.get(ExternalSecretsConfigFileLoader);

		await expect(loader.load(filePath)).rejects.toThrow(/unknownType[\s\S]*missingProject/);
	});

	// Covers the schema pieces flagged by review as untested at the Task 4 (schema) level:
	// the `key` field's SECRETS_PROVIDER_KEY_REGEX validation, and the `.strict()` rejection
	// of unrecognized keys on the fromEnv/fromFile object variants of a settings value.
	// Both are exercised here through the loader so the aggregated error a user actually
	// sees is what gets asserted on, not the schema in isolation.
	test('surfaces an invalid key format and a malformed settings shape in the aggregated error', async () => {
		const filePath = writeConfigFile({
			connections: [
				{
					key: '1badKey',
					type: 'vault',
					settings: { url: { fromEnv: 'X', extra: 'Y' } },
				},
			],
		});

		const loader = Container.get(ExternalSecretsConfigFileLoader);

		let thrown: Error | undefined;
		try {
			await loader.load(filePath);
		} catch (error) {
			thrown = error as Error;
		}

		expect(thrown).toBeDefined();
		expect(thrown?.message).toContain(filePath);
		expect(thrown?.message).toContain('1badKey');
		// key: fails SECRETS_PROVIDER_KEY_REGEX (must start with a letter)
		expect(thrown?.message).toMatch(/key:/);
		// settings.url: fails the .strict() object variant (fromEnv object with an extra key)
		expect(thrown?.message).toContain("Unrecognized key(s) in object: 'extra'");
	});
});
