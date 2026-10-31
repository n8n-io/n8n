import type { CreatePromotionProviderDto, UpdatePromotionProviderDto } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionEnvironmentRepository } from '../database/repositories/promotion-environment.repository';
import type { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import type { GitHostClients } from '../git-hosts/git-host-clients';
import { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionsGitService } from '../promotions-git.service';

describe('PromotionProvidersService', () => {
	const providerRepository = mock<PromotionProviderRepository>();
	const environmentRepository = mock<PromotionEnvironmentRepository>();
	const gitService = mock<PromotionsGitService>();
	const cipher = mock<Cipher>();
	const eventService = mock<EventService>();
	const actor = mock<User>({ id: 'user-1' });

	const service = new PromotionProvidersService(
		providerRepository,
		environmentRepository,
		gitService,
		cipher,
		mock<GitHostClients>(),
		eventService,
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
		providerRepository.updateProviderIfUnchanged.mockResolvedValue(true);
	});

	describe('create', () => {
		it('generates a key pair and stores the private key encrypted', async () => {
			const result = await service.create(
				{
					name: 'Deploy key',
					type: 'git',
					auth: { authType: 'ssh-key', keyType: 'ed25519' },
				} as CreatePromotionProviderDto,
				actor,
			);

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			const saved = providerRepository.insertProvider.mock.calls[0][0];
			expect(saved.authType).toBe('ssh-key');
			expect(saved.config).toEqual({ schemaVersion: 1, publicKey: 'PUB', keyType: 'ed25519' });
			expect(saved.auth).toBe('enc:{"schemaVersion":1,"privateKey":"PRIV"}');
			expect(result.publicKey).toBe('PUB');
		});

		it('stores the username and password encrypted', async () => {
			const result = await service.create(
				{
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p' },
				} as CreatePromotionProviderDto,
				actor,
			);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			const saved = providerRepository.insertProvider.mock.calls[0][0];
			expect(saved.config).toEqual({ schemaVersion: 1 });
			expect(saved.auth).toBe('enc:{"schemaVersion":1,"username":"u","password":"p"}');
			expect(result.publicKey).toBeNull();
		});

		it('rejects a password with a newline, which would split the credential helper', async () => {
			await expect(
				service.create(
					{
						name: 'Bot user',
						type: 'git',
						auth: { authType: 'token', username: 'u', password: 'p\nmore' },
					} as CreatePromotionProviderDto,
					actor,
				),
			).rejects.toThrow(BadRequestError);
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('emits an event with the provider type and no secrets', async () => {
			providerRepository.insertProvider.mockImplementationOnce(
				async (provider) =>
					({
						...provider,
						id: 'prov1',
						createdAt: new Date(),
						updatedAt: new Date(),
					}) as PromotionProvider,
			);

			await service.create(
				{
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p' },
				} as CreatePromotionProviderDto,
				actor,
			);

			expect(eventService.emit).toHaveBeenCalledWith('promotion-provider-created', {
				user: actor,
				providerId: 'prov1',
				providerType: 'git',
				authType: 'token',
				outcome: 'success',
				durationMs: expect.any(Number),
			});
		});

		it('emits a failed attempt when the create is rejected', async () => {
			await expect(
				service.create(
					{
						name: 'Bot user',
						type: 'git',
						auth: { authType: 'token', username: 'u', password: 'p\nmore' },
					} as CreatePromotionProviderDto,
					actor,
				),
			).rejects.toThrow(BadRequestError);

			expect(eventService.emit).toHaveBeenCalledWith('promotion-provider-created', {
				user: actor,
				providerType: 'git',
				authType: 'token',
				outcome: 'failed',
				failureKind: 'user',
				durationMs: expect.any(Number),
			});
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('leaves the stored ciphertext out of the response', async () => {
			const result = await service.create(
				{
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p' },
				} as CreatePromotionProviderDto,
				actor,
			);

			expect(JSON.stringify(result)).not.toContain('enc:');
			expect(result.provider).not.toHaveProperty('auth');
		});
	});

	describe('update', () => {
		it('rejects an empty update before writing to the repository', async () => {
			await expect(service.update('prov1', {}, actor)).rejects.toThrow(
				'At least one field is required',
			);
			expect(providerRepository.updateProvider).not.toHaveBeenCalled();
		});

		it('keeps the stored credentials when the request has no auth', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update('prov1', { name: 'renamed' } as UpdatePromotionProviderDto, actor);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			expect(providerRepository.updateProvider).toHaveBeenCalledWith('prov1', {
				name: 'renamed',
			});
			expect(providerRepository.updateProviderIfUnchanged).not.toHaveBeenCalled();
		});

		it('rotates a key without changing its algorithm', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update(
				'prov1',
				{ auth: { authType: 'ssh-key' } } as UpdatePromotionProviderDto,
				actor,
			);

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('rsa');
			const [, expected, changes] = providerRepository.updateProviderIfUnchanged.mock.calls[0];
			expect(expected).toEqual({ config: sshProvider().config, auth: sshProvider().auth });
			expect(changes.config).toEqual({ schemaVersion: 1, publicKey: 'PUB', keyType: 'rsa' });
			expect(changes.auth).toBe('enc:{"schemaVersion":1,"privateKey":"PRIV"}');
		});

		it('emits the fields the request sent, never their values', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update(
				'prov1',
				{ name: 'renamed', auth: { authType: 'ssh-key' } } as UpdatePromotionProviderDto,
				actor,
			);

			expect(eventService.emit).toHaveBeenCalledWith('promotion-provider-updated', {
				user: actor,
				providerId: 'prov1',
				providerType: 'git',
				changedFields: ['name', 'auth'],
				outcome: 'success',
				durationMs: expect.any(Number),
			});
		});

		it('emits a failed attempt when the provider is gone after a name-only update', async () => {
			providerRepository.findById.mockResolvedValueOnce(sshProvider()).mockResolvedValueOnce(null);

			await expect(
				service.update('prov1', { name: 'renamed' } as UpdatePromotionProviderDto, actor),
			).rejects.toThrow(NotFoundError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-provider-updated',
				expect.objectContaining({ outcome: 'failed', failureKind: 'user' }),
			);
		});

		it('emits a failed attempt when the update loses a race', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			providerRepository.updateProviderIfUnchanged.mockResolvedValueOnce(false);

			await expect(
				service.update(
					'prov1',
					{ auth: { authType: 'ssh-key' } } as UpdatePromotionProviderDto,
					actor,
				),
			).rejects.toThrow(ConflictError);

			expect(eventService.emit).toHaveBeenCalledWith(
				'promotion-provider-updated',
				expect.objectContaining({
					changedFields: ['auth'],
					outcome: 'failed',
					failureKind: 'user',
				}),
			);
		});

		it('emits no event for an unknown provider', async () => {
			providerRepository.findById.mockResolvedValue(null);

			await expect(
				service.update('missing', { name: 'x' } as UpdatePromotionProviderDto, actor),
			).rejects.toThrow(NotFoundError);
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('emits an event after it deletes an unused provider', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			environmentRepository.countByProviderId.mockResolvedValue(0);
			providerRepository.deleteProvider.mockResolvedValue(true);

			await service.delete('prov1', actor);

			expect(eventService.emit).toHaveBeenCalledWith('promotion-provider-deleted', {
				user: actor,
				providerId: 'prov1',
				providerType: 'git',
			});
		});

		it('emits no event when a concurrent request already deleted the provider', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			environmentRepository.countByProviderId.mockResolvedValue(0);
			providerRepository.deleteProvider.mockResolvedValue(false);

			await service.delete('prov1', actor);

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('emits no event for a provider that an environment uses', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			environmentRepository.countByProviderId.mockResolvedValue(1);

			await expect(service.delete('prov1', actor)).rejects.toThrow(ConflictError);

			expect(providerRepository.deleteProvider).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
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
});
