import type { Logger } from '@n8n/backend-common';
import type {
	ServiceAccountCredential,
	ServiceAccountCredentialRepository,
	User,
	UserRepository,
} from '@n8n/db';
import {
	Cipher,
	CipherAes256GCM,
	CipherAes256CBC,
	EncryptionKeyProxy,
	type InstanceSettings,
} from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';

describe('ServiceAccountCredentialService', () => {
	const repository = mock<ServiceAccountCredentialRepository>();
	const userRepository = mock<UserRepository>();
	// Real cipher with a test key so encrypt/decrypt genuinely round-trips.
	const cipher = new Cipher(
		mock<InstanceSettings>({ encryptionKey: 'test_key_for_testing' }),
		new CipherAes256GCM(),
		new CipherAes256CBC(),
		new EncryptionKeyProxy(),
	);
	const service = new ServiceAccountCredentialService(
		repository,
		cipher,
		userRepository,
		mock<Logger>(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createForUser', () => {
		it('stores an encrypted (not plaintext, not bcrypt) secret and returns the raw secret once', async () => {
			const userId = 'user-1';
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: userId }));
			repository.findByClientId.mockResolvedValue(mock<ServiceAccountCredential>({ id: 'cred-1' }));

			const { rawClientSecret } = await service.createForUser(userId, 'my label', 'client_secret');

			expect(rawClientSecret.length).toBeGreaterThan(0);
			const [insertedArg] = repository.insertCredential.mock.calls[0];
			const stored = insertedArg.clientSecret;

			// Not stored in plaintext, and not a bcrypt hash.
			expect(stored).not.toBe(rawClientSecret);
			expect(stored.startsWith('$2')).toBe(false);
			// Reversibly encrypted: decrypting recovers the raw secret.
			expect(cipher.decrypt(stored)).toBe(rawClientSecret);
		});

		it('defaults the credential type to client_secret', async () => {
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: 'user-1' }));
			repository.findByClientId.mockResolvedValue(mock<ServiceAccountCredential>());

			await service.createForUser('user-1', undefined);

			expect(repository.insertCredential).toHaveBeenCalledWith(
				expect.objectContaining({ credentialType: 'client_secret' }),
				{},
			);
		});

		it('throws NotFoundError when the target user does not exist', async () => {
			userRepository.findOneBy.mockResolvedValue(null);

			await expect(service.createForUser('missing', undefined)).rejects.toThrow(NotFoundError);
			expect(repository.insertCredential).not.toHaveBeenCalled();
		});
	});

	describe('getDecryptedByClientId', () => {
		it('round-trips the stored secret back to the raw value', async () => {
			const rawClientSecret = 'super-secret-value';
			repository.findByClientId.mockResolvedValue(
				mock<ServiceAccountCredential>({
					clientId: 'client-1',
					clientSecret: cipher.encrypt(rawClientSecret),
				}),
			);

			const result = await service.getDecryptedByClientId('client-1');

			expect(result?.clientSecret).toBe(rawClientSecret);
			expect(result?.credential.clientId).toBe('client-1');
		});

		it('returns null when no credential matches', async () => {
			repository.findByClientId.mockResolvedValue(null);

			expect(await service.getDecryptedByClientId('missing')).toBeNull();
		});
	});

	describe('getDecryptedForUser', () => {
		it('decrypts and returns the most recently created credential for the user', async () => {
			const rawClientSecret = 'newest-secret';
			repository.findByUserId.mockResolvedValue([
				mock<ServiceAccountCredential>({
					clientId: 'old',
					clientSecret: cipher.encrypt('old-secret'),
					createdAt: new Date('2020-01-01'),
				}),
				mock<ServiceAccountCredential>({
					clientId: 'new',
					clientSecret: cipher.encrypt(rawClientSecret),
					createdAt: new Date('2024-01-01'),
				}),
			]);

			const result = await service.getDecryptedForUser('user-1');

			expect(result).toEqual({ clientId: 'new', clientSecret: rawClientSecret });
		});

		it('returns null when the user has no credential', async () => {
			repository.findByUserId.mockResolvedValue([]);

			expect(await service.getDecryptedForUser('user-1')).toBeNull();
		});
	});

	describe('listForUser', () => {
		it('delegates to the repository scoped to the user', async () => {
			const credentials = [mock<ServiceAccountCredential>()];
			repository.findByUserId.mockResolvedValue(credentials);

			const result = await service.listForUser('user-1');

			expect(repository.findByUserId).toHaveBeenCalledWith('user-1', {});
			expect(result).toBe(credentials);
		});
	});

	describe('delete', () => {
		it('delegates to the repository', async () => {
			repository.deleteById.mockResolvedValue(1);

			await service.delete('cred-1');

			expect(repository.deleteById).toHaveBeenCalledWith('cred-1', {});
		});
	});
});
