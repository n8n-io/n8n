import type { CreatePromotionProviderDto, UpdatePromotionProviderDto } from '@n8n/api-types';
import type { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { PromotionProvider } from '../database/entities/promotion-provider.entity';
import type { PromotionConnectionRepository } from '../database/repositories/promotion-connection.repository';
import type { PromotionProviderRepository } from '../database/repositories/promotion-provider.repository';
import { PromotionProvidersService } from '../promotion-providers.service';
import type { PromotionsGitService } from '../promotions-git.service';

describe('PromotionProvidersService', () => {
	const providerRepository = mock<PromotionProviderRepository>();
	const connectionRepository = mock<PromotionConnectionRepository>();
	const gitService = mock<PromotionsGitService>();
	const cipher = mock<Cipher>();

	const service = new PromotionProvidersService(
		providerRepository,
		connectionRepository,
		gitService,
		cipher,
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
	});

	describe('create', () => {
		it('generates and encrypts an SSH key pair for an ssh-key provider', async () => {
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

		it('encrypts username and password for a token provider', async () => {
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

		it('rejects credentials that would break the Git credential helper', async () => {
			await expect(
				service.create({
					name: 'Bot user',
					type: 'git',
					auth: { authType: 'token', username: 'u', password: 'p\nmore' },
				} as CreatePromotionProviderDto),
			).rejects.toThrow(BadRequestError);
			expect(providerRepository.insertProvider).not.toHaveBeenCalled();
		});

		it('never returns the encrypted credentials', async () => {
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
		it('rejects changing the authentication method', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await expect(
				service.update('prov1', {
					auth: { authType: 'token', username: 'u', password: 'p' },
				} as UpdatePromotionProviderDto),
			).rejects.toThrow(BadRequestError);
			expect(providerRepository.updateProvider).not.toHaveBeenCalled();
		});

		it('keeps the stored credentials when auth is left out', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update('prov1', { name: 'renamed' } as UpdatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).not.toHaveBeenCalled();
			expect(providerRepository.updateProvider).toHaveBeenCalledWith('prov1', {
				name: 'renamed',
			});
		});

		it('rotates the key with the algorithm the provider already uses', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.update('prov1', {
				auth: { authType: 'ssh-key' },
			} as UpdatePromotionProviderDto);

			expect(gitService.generateSshKeyPair).toHaveBeenCalledWith('rsa');
			const changes = providerRepository.updateProvider.mock.calls[0][1];
			expect(changes.config).toEqual({ schemaVersion: 1, publicKey: 'PUB', keyType: 'rsa' });
			expect(changes.auth).toBe('enc:{"schemaVersion":1,"privateKey":"PRIV"}');
		});

		it('replaces the username and password of a token provider', async () => {
			providerRepository.findById.mockResolvedValue(tokenProvider());

			await service.update('prov2', {
				auth: { authType: 'token', username: 'u2', password: 'p2' },
			} as UpdatePromotionProviderDto);

			const changes = providerRepository.updateProvider.mock.calls[0][1];
			expect(changes.auth).toBe('enc:{"schemaVersion":1,"username":"u2","password":"p2"}');
		});

		it('rejects an unknown provider with 404', async () => {
			providerRepository.findById.mockResolvedValue(null);

			await expect(
				service.update('missing', { name: 'x' } as UpdatePromotionProviderDto),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('delete', () => {
		it('refuses to delete a provider that a connection uses', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());
			connectionRepository.countByProviderId.mockResolvedValue(1);

			await expect(service.delete('prov1')).rejects.toThrow(ConflictError);
			expect(providerRepository.deleteProvider).not.toHaveBeenCalled();
		});

		it('deletes an unused provider', async () => {
			providerRepository.findById.mockResolvedValue(sshProvider());

			await service.delete('prov1');

			expect(providerRepository.deleteProvider).toHaveBeenCalledWith('prov1');
		});
	});

	describe('decryptCredentials', () => {
		it('reads an ssh-key payload', async () => {
			const provider = sshProvider();

			await expect(service.decryptCredentials(provider)).resolves.toEqual({
				authType: 'ssh-key',
				privateKey: 'PRIV',
			});
		});

		it('reads a token payload', async () => {
			const provider = tokenProvider();

			await expect(service.decryptCredentials(provider)).resolves.toEqual({
				authType: 'token',
				username: 'u',
				password: 'p',
			});
		});

		it('rejects a payload version it cannot read', async () => {
			const provider = sshProvider();
			provider.auth = 'enc:{"schemaVersion":2,"privateKey":"PRIV"}';

			await expect(service.decryptCredentials(provider)).rejects.toThrow(BadRequestError);
		});

		it('rejects a payload that does not match the stored auth type', async () => {
			const provider = sshProvider();
			provider.auth = 'enc:{"schemaVersion":1,"username":"u","password":"p"}';

			await expect(service.decryptCredentials(provider)).rejects.toThrow(BadRequestError);
		});
	});
});
