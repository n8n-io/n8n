import type { CreatePromotionProviderDto, UpdatePromotionProviderDto } from '@n8n/api-types';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import type { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import type { GitHostClients } from '../git-hosts/git-host-clients';
import type { GitHostClient } from '../git-hosts/git-host.types';
import { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionsGitService } from '../promotions-git.service';

describe('PromotionProvidersService', () => {
	const providerRepository = mock<PromotionProviderRepository>();
	const connectionRepository = mock<PromotionConnectionRepository>();
	const gitService = mock<PromotionsGitService>();
	const cipher = mock<Cipher>();
	const gitHosts = mock<GitHostClients>();
	const gitLabClient = mock<GitHostClient>();

	const service = new PromotionProvidersService(
		providerRepository,
		connectionRepository,
		gitService,
		cipher,
		gitHosts,
	);

	const sshProvider = (): PromotionProvider =>
		({
			id: 'prov1',
			name: 'Deploy key',
			type: 'git',
			authType: 'ssh-key',
			config: { schemaVersion: 1, publicKey: 'PUB', keyType: 'rsa' },
			auth: 'enc:{"schemaVersion":1,"privateKey":"PRIV"}',
			createdAt: new Date(),
			updatedAt: new Date(),
		}) as PromotionProvider;

	const tokenProvider = (): PromotionProvider =>
		({
			id: 'prov2',
			name: 'Bot user',
			type: 'git',
			authType: 'token',
			config: { schemaVersion: 1 },
			auth: 'enc:{"schemaVersion":1,"username":"u","password":"p"}',
			createdAt: new Date(),
			updatedAt: new Date(),
		}) as PromotionProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		providerRepository.insertProvider.mockImplementation(async (input) => {
			return {
				...input,
				id: 'new',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as PromotionProvider;
		});
		cipher.encryptV2.mockImplementation(async (value) => `enc:${value as string}`);
		cipher.decryptV2.mockImplementation(async (value) => value.replace(/^enc:/, ''));
		gitService.generateSshKeyPair.mockResolvedValue({ publicKey: 'PUB', privateKey: 'PRIV' });
		connectionRepository.countByProviderId.mockResolvedValue(0);
		gitHosts.clientFor.mockReturnValue(gitLabClient);
		gitLabClient.validateAccess.mockResolvedValue(undefined);
	});

	describe('create', () => {
		it('generates a key pair and stores the private key encrypted', async () => {
			const result = await service.create({
				name: 'Deploy key',
				type: 'git',
				auth: { authType: 'ssh-key', keyType: 'ed25519' },
			} as CreatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			const saved = providerRepository.insertProvider.mock.calls[0][0];
			expect(saved.authType).toBe('ssh-key');
			expect(saved.config).toEqual({ schemaVersion: 1, publicKey: 'PUB', keyType: 'ed25519' });
			expect(saved.auth).toBe('enc:{"schemaVersion":1,"privateKey":"PRIV"}');
			expect(result.publicKey).toBe('PUB');
		});

		it('stores the username and password encrypted', async () => {
			const result = await service.create({
				name: 'Bot user',
				type: 'git',
				auth: { authType: 'token', username: 'u', password: 'p' },
			} as CreatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			const saved = providerRepository.insertProvider.mock.calls[0][0];
			expect(saved.config).toEqual({ schemaVersion: 1 });
			expect(saved.auth).toBe('enc:{"schemaVersion":1,"username":"u","password":"p"}');
			expect(result.publicKey).toBeNull();
		});

		it('rejects a password with a newline, which would split the credential helper', async () => {
			await expect(
				service.create({
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p\nmore' },
				} as CreatePromotionProviderDto),
			).rejects.toThrow(BadRequestError);
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('leaves the stored ciphertext out of the response', async () => {
			const result = await service.create({
				name: 'Bot user',
				type: 'git',
				auth: { authType: 'token', username: 'u', password: 'p' },
			} as CreatePromotionProviderDto);

			expect(JSON.stringify(result)).not.toContain('enc:');
			expect(result.provider).not.toHaveProperty('auth');
		});
	});

	describe('update', () => {
		it('rejects an empty update before writing to the repository', async () => {
			await expect(service.update('prov1', {})).rejects.toThrow('At least one field is required');
			expect(providerRepository.updateProvider).not.toHaveBeenCalled();
		});

		it('keeps the stored credentials when the request has no auth', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update('prov1', { name: 'renamed' } as UpdatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			expect(providerRepository.updateProvider).toHaveBeenCalledWith('prov1', {
				name: 'renamed',
			});
		});

		it('rotates a key without changing its algorithm', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update('prov1', {
				auth: { authType: 'ssh-key' },
			} as UpdatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('rsa');
			const changes = providerRepository.updateProvider.mock.calls[0][1];
			expect(changes.config).toEqual({ schemaVersion: 1, publicKey: 'PUB', keyType: 'rsa' });
			expect(changes.auth).toBe('enc:{"schemaVersion":1,"privateKey":"PRIV"}');
		});

		it('reports an unknown provider as not found', async () => {
			providerRepository.findById.mockResolvedValue(null);

			await expect(
				service.update('missing', { name: 'x' } as UpdatePromotionProviderDto),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('delete', () => {
		it('refuses to delete a provider a connection still uses', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			connectionRepository.countByProviderId.mockResolvedValue(1);

			await expect(service.delete('prov1')).rejects.toThrow(ConflictError);
			expect(providerRepository.deleteProvider).not.toHaveBeenCalled();
		});
	});

	describe('decryptCredentials', () => {
		it('reads a stored ssh-key payload', async () => {
			const provider = sshProvider();

			await expect(service.decryptCredentials(provider)).resolves.toEqual({
				authType: 'ssh-key',
				privateKey: 'PRIV',
			});
		});

		it('reads a stored username and password payload', async () => {
			const provider = tokenProvider();

			await expect(service.decryptCredentials(provider)).resolves.toEqual({
				authType: 'token',
				username: 'u',
				password: 'p',
			});
		});

		it('rejects a stored payload version it cannot read', async () => {
			const provider = sshProvider();
			provider.auth = 'enc:{"schemaVersion":2,"privateKey":"PRIV"}';

			await expect(service.decryptCredentials(provider)).rejects.toThrow(BadRequestError);
		});

		it('reports a decryption failure with credential replacement instructions', async () => {
			cipher.decryptV2.mockRejectedValueOnce(new Error('Cannot decrypt'));

			const result = service.decryptCredentials(tokenProvider());
			await expect(result).rejects.toThrow(BadRequestError);
			await expect(result).rejects.toThrow(
				'The stored provider credentials cannot be read. Update the provider to replace them.',
			);
		});

		it('reports malformed stored JSON with credential replacement instructions', async () => {
			cipher.decryptV2.mockResolvedValueOnce('invalid JSON');

			const result = service.decryptCredentials(tokenProvider());
			await expect(result).rejects.toThrow(BadRequestError);
			await expect(result).rejects.toThrow(
				'The stored provider credentials cannot be read. Update the provider to replace them.',
			);
		});

		it('rejects a stored payload that does not match the auth type', async () => {
			const provider = sshProvider();
			provider.auth = 'enc:{"schemaVersion":1,"username":"u","password":"p"}';

			await expect(service.decryptCredentials(provider)).rejects.toThrow(BadRequestError);
		});
	});

	describe('GitLab providers', () => {
		const baseUrlConfig = { schemaVersion: 1 as const, baseUrl: 'https://gitlab.example.com' };
		const gitLabInput = {
			name: 'GitLab',
			type: 'gitlab',
			auth: { authType: 'token', username: 'bot', password: 'glpat-token' },
			config: baseUrlConfig,
		} as CreatePromotionProviderDto;

		const gitLabProvider = (): PromotionProvider =>
			({
				...tokenProvider(),
				id: 'prov3',
				type: 'gitlab',
				config: baseUrlConfig,
				auth: 'enc:{"schemaVersion":1,"username":"bot","password":"glpat-token"}',
			}) as PromotionProvider;

		it('stores the base URL as the config and the token encrypted', async () => {
			await service.create(gitLabInput);

			const saved = providerRepository.insertProvider.mock.calls[0][0];
			expect(saved.type).toBe('gitlab');
			expect(saved.config).toEqual(baseUrlConfig);
			expect(saved.auth).toBe('enc:{"schemaVersion":1,"username":"n8n","password":"glpat-token"}');
			expect(gitLabClient.validateAccess).toHaveBeenCalledWith({
				baseUrl: baseUrlConfig.baseUrl,
				username: 'n8n',
				accessToken: 'glpat-token',
			});
			expect(gitLabClient.validateAccess.mock.invocationCallOrder[0]).toBeLessThan(
				providerRepository.insertProvider.mock.invocationCallOrder[0],
			);
		});

		it('requires a base URL', async () => {
			await expect(service.create({ ...gitLabInput, config: undefined })).rejects.toThrow(
				'A gitlab provider requires a config with a base URL',
			);
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('rejects an SSH key, because the GitLab API needs a token', async () => {
			await expect(
				service.create({
					...gitLabInput,
					auth: { authType: 'ssh-key', keyType: 'ed25519' },
				}),
			).rejects.toThrow('A gitlab provider does not support ssh-key authentication');
			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
		});

		it('rejects a config on a plain Git provider', async () => {
			await expect(
				service.create({
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p' },
					config: baseUrlConfig,
				} as CreatePromotionProviderDto),
			).rejects.toThrow('A git provider does not take a config');
		});

		it('keeps the base URL when the token changes', async () => {
			providerRepository.findById.mockResolvedValue(gitLabProvider());

			await service.update('prov3', {
				auth: { authType: 'token', username: 'bot', password: 'glpat-new' },
			} as UpdatePromotionProviderDto);

			const changes = providerRepository.updateProvider.mock.calls[0][1];
			expect(changes).not.toHaveProperty('config');
			expect(changes.auth).toBe('enc:{"schemaVersion":1,"username":"n8n","password":"glpat-new"}');
			expect(gitLabClient.validateAccess).toHaveBeenCalledWith({
				baseUrl: baseUrlConfig.baseUrl,
				username: 'n8n',
				accessToken: 'glpat-new',
			});
		});

		it('moves to another base URL', async () => {
			providerRepository.findById.mockResolvedValue(gitLabProvider());
			const moved = { schemaVersion: 1 as const, baseUrl: 'https://gitlab.internal' };

			await service.update('prov3', { config: moved } as UpdatePromotionProviderDto);

			expect(providerRepository.updateProvider).toHaveBeenCalledWith('prov3', { config: moved });
			expect(gitLabClient.validateAccess).toHaveBeenCalledWith({
				baseUrl: moved.baseUrl,
				username: 'bot',
				accessToken: 'glpat-token',
			});
		});

		it('does not save a provider when validation fails', async () => {
			gitLabClient.validateAccess.mockRejectedValueOnce(
				new BadRequestError('GitLab rejected the access token'),
			);

			await expect(service.create(gitLabInput)).rejects.toThrow('GitLab rejected the access token');
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('keeps the stored state when replacement credentials fail validation', async () => {
			providerRepository.findById.mockResolvedValue(gitLabProvider());
			gitLabClient.validateAccess.mockRejectedValueOnce(
				new BadRequestError('GitLab rejected the access token'),
			);

			await expect(
				service.update('prov3', {
					name: 'Renamed',
					config: { schemaVersion: 1, baseUrl: 'https://gitlab.internal' },
					auth: { authType: 'token', username: 'bot', password: 'replacement' },
				}),
			).rejects.toThrow('GitLab rejected the access token');
			expect(providerRepository.updateProvider).not.toHaveBeenCalled();
		});

		it('validates the replacement URL with the replacement token', async () => {
			providerRepository.findById.mockResolvedValue(gitLabProvider());

			await service.update('prov3', {
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.internal' },
				auth: { authType: 'token', username: 'bot', password: 'replacement' },
			});

			expect(gitLabClient.validateAccess).toHaveBeenCalledWith({
				baseUrl: 'https://gitlab.internal',
				username: 'n8n',
				accessToken: 'replacement',
			});
		});

		it('can rename a provider without a network request', async () => {
			providerRepository.findById.mockResolvedValue(gitLabProvider());

			await service.update('prov3', { name: 'Renamed' });

			expect(providerRepository.updateProvider).toHaveBeenCalledWith('prov3', { name: 'Renamed' });
			expect(gitLabClient.validateAccess).not.toHaveBeenCalled();
		});

		it('rejects a config update on a plain Git provider', async () => {
			providerRepository.findById.mockResolvedValue(tokenProvider());

			await expect(
				service.update('prov2', { config: baseUrlConfig } as UpdatePromotionProviderDto),
			).rejects.toThrow(BadRequestError);
			expect(providerRepository.updateProvider).not.toHaveBeenCalled();
		});

		describe('listRepositories', () => {
			const query = { search: 'api', offset: 0, limit: 20 };

			it('reads the host with the stored token and returns HTTPS remotes', async () => {
				providerRepository.findById.mockResolvedValue(gitLabProvider());
				gitLabClient.listRepositories.mockResolvedValue({
					repositories: [
						{
							id: '7',
							fullPath: 'platform/api',
							remoteUrl: 'https://gitlab.example.com/platform/api.git',
						},
					],
					hasNextPage: true,
				});

				const result = await service.listRepositories('prov3', query);

				expect(gitHosts.clientFor).toHaveBeenCalledWith('gitlab');
				expect(gitLabClient.listRepositories).toHaveBeenCalledWith(
					{ baseUrl: 'https://gitlab.example.com', username: 'bot', accessToken: 'glpat-token' },
					query,
				);
				expect(result).toEqual({
					data: [
						{
							id: '7',
							fullPath: 'platform/api',
							remoteUrl: 'https://gitlab.example.com/platform/api.git',
						},
					],
					hasNextPage: true,
				});
			});

			it('rejects a plain Git provider, which has no host API', async () => {
				providerRepository.findById.mockResolvedValue(tokenProvider());

				await expect(service.listRepositories('prov2', query)).rejects.toThrow(
					'Only a Git host provider, such as GitLab, can list repositories',
				);
				expect(gitLabClient.listRepositories).not.toHaveBeenCalled();
			});

			it('rejects a stored config it cannot read', async () => {
				providerRepository.findById.mockResolvedValue({
					...gitLabProvider(),
					config: { schemaVersion: 1 },
				} as PromotionProvider);

				await expect(service.listRepositories('prov3', query)).rejects.toThrow(
					'The stored provider config cannot be read',
				);
			});
		});
	});
});
