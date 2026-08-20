import type { UpdateInstanceGitSettingsDto } from '@n8n/api-types';
import type { SettingsRepository } from '@n8n/db';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY } from '../constants';
import type { GitConnectionsGitService } from '../git-connections-git.service';
import { InstanceGitConnectionService } from '../instance-git-connection.service';

describe('InstanceGitConnectionService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const gitService = mock<GitConnectionsGitService>();
	const cipher = mock<Cipher>();

	const service = new InstanceGitConnectionService(settingsRepository, gitService, cipher);

	// Simulate the single settings row so update → get round-trips through the DB layer.
	let stored: string | null;

	/** The `value` most recently persisted, parsed back to an object. */
	const savedPreferences = () => {
		const call = settingsRepository.save.mock.calls.at(-1);
		return JSON.parse((call![0] as { value: string }).value) as Record<string, unknown>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		stored = null;
		settingsRepository.findByKey.mockImplementation(async () =>
			stored ? ({ value: stored } as never) : null,
		);
		settingsRepository.save.mockImplementation(async (entity) => {
			stored = (entity as { value: string }).value;
			return entity as never;
		});
		cipher.encryptV2.mockImplementation(async (v: string) => `enc:${v}`);
		gitService.generateSshKeyPair.mockResolvedValue({ publicKey: 'PUB', privateKey: 'PRIV' });
	});

	const configureHttps = async (extra: Partial<UpdateInstanceGitSettingsDto> = {}) =>
		await service.updateSettings({
			enabled: true,
			repositoryUrl: 'https://github.com/o/r.git',
			connectionType: 'https',
			username: 'user',
			password: 'pass',
			...extra,
		});

	describe('getSettings', () => {
		it('returns a disabled, empty connection before it is ever configured', async () => {
			const result = await service.getSettings();

			expect(result).toEqual({
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
			expect(settingsRepository.save).not.toHaveBeenCalled();
		});

		it('never returns secrets', async () => {
			await configureHttps();

			const result = await service.getSettings();

			expect(result).not.toHaveProperty('encryptedUsername');
			expect(result).not.toHaveProperty('encryptedPassword');
			expect(result).not.toHaveProperty('encryptedPrivateKey');
		});
	});

	describe('updateSettings validation', () => {
		it('rejects an empty body', async () => {
			await expect(service.updateSettings({})).rejects.toThrow(BadRequestError);
		});

		it('rejects enabling without a configured connection', async () => {
			await expect(service.updateSettings({ enabled: true })).rejects.toThrow(BadRequestError);
			expect(settingsRepository.save).not.toHaveBeenCalled();
		});

		it('rejects auth material when no connection type is set or provided', async () => {
			await expect(service.updateSettings({ username: 'user', password: 'pass' })).rejects.toThrow(
				'Connection type is required to set authentication',
			);
		});

		it('validates the repository URL against the connection type', async () => {
			gitService.validateRepositoryUrl.mockImplementationOnce(() => {
				throw new BadRequestError('bad url');
			});

			await expect(
				service.updateSettings({
					repositoryUrl: 'not-a-url',
					connectionType: 'https',
					username: 'user',
					password: 'pass',
				}),
			).rejects.toThrow('bad url');
		});

		it('validates a supplied branch name', async () => {
			gitService.validateBranchName.mockRejectedValueOnce(new BadRequestError('bad branch'));

			await expect(
				service.updateSettings({ connectionType: 'ssh', branchName: 'bad branch' }),
			).rejects.toThrow('bad branch');
		});
	});

	describe('SSH configuration', () => {
		it('generates and stores an encrypted key pair on first configuration', async () => {
			const result = await service.updateSettings({
				enabled: true,
				repositoryUrl: 'git@github.com:o/r.git',
				connectionType: 'ssh',
			});

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			expect(result).toMatchObject({
				enabled: true,
				connectionType: 'ssh',
				publicKey: 'PUB',
				keyGeneratorType: 'ed25519',
				baseCommit: null,
			});
			expect(savedPreferences()).toMatchObject({ encryptedPrivateKey: 'enc:PRIV' });
		});

		it('rejects username/password for an SSH connection', async () => {
			await expect(
				service.updateSettings({ connectionType: 'ssh', username: 'u', password: 'p' }),
			).rejects.toThrow('Username and password are only valid for HTTPS connections');
		});

		it('rejects changing the SSH key type after creation', async () => {
			await service.updateSettings({ connectionType: 'ssh' });

			await expect(service.updateSettings({ keyGeneratorType: 'rsa' })).rejects.toThrow(
				'SSH key type cannot be changed after creation',
			);
		});

		it('does not regenerate the key pair on an unrelated update', async () => {
			await service.updateSettings({ connectionType: 'ssh' });
			gitService.generateSshKeyPair.mockClear();

			await service.updateSettings({ branchName: 'main' });

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			expect(savedPreferences()).toMatchObject({ encryptedPrivateKey: 'enc:PRIV' });
		});
	});

	describe('HTTPS configuration', () => {
		it('stores encrypted credentials', async () => {
			const result = await configureHttps();

			expect(result).toMatchObject({ connectionType: 'https', publicKey: null });
			expect(savedPreferences()).toMatchObject({
				encryptedUsername: 'enc:user',
				encryptedPassword: 'enc:pass',
			});
		});

		it('requires username and password together on first configuration', async () => {
			await expect(
				service.updateSettings({ connectionType: 'https', username: 'user' }),
			).rejects.toThrow('must be provided together');
		});

		it('rejects a key generator type for HTTPS', async () => {
			await expect(
				service.updateSettings({ connectionType: 'https', keyGeneratorType: 'rsa' }),
			).rejects.toThrow('Key generator type is only valid for SSH connections');
		});
	});

	describe('partial patch', () => {
		it('preserves stored secrets when updating an unrelated field', async () => {
			await configureHttps();

			await service.updateSettings({ branchName: 'main' });

			expect(savedPreferences()).toMatchObject({
				encryptedUsername: 'enc:user',
				encryptedPassword: 'enc:pass',
				branchName: 'main',
				enabled: true,
			});
		});

		it('disables while retaining the configuration', async () => {
			await configureHttps();

			const result = await service.updateSettings({ enabled: false });

			expect(result).toMatchObject({
				enabled: false,
				repositoryUrl: 'https://github.com/o/r.git',
				connectionType: 'https',
			});
		});

		it('clears SSH material when switching to HTTPS', async () => {
			await service.updateSettings({ connectionType: 'ssh' });

			await service.updateSettings({ connectionType: 'https', username: 'user', password: 'pass' });

			expect(savedPreferences()).toMatchObject({
				connectionType: 'https',
				publicKey: null,
				encryptedPrivateKey: null,
				keyGeneratorType: null,
				encryptedUsername: 'enc:user',
			});
		});
	});

	it('persists under the instance settings key with loadOnStartup', async () => {
		await service.updateSettings({ connectionType: 'ssh' });

		expect(settingsRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				key: INSTANCE_GIT_CONNECTION_SETTINGS_DB_KEY,
				loadOnStartup: true,
			}),
			{ transaction: false },
		);
	});
});
