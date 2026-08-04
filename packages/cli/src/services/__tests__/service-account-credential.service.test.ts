import type {
	ServiceAccountCredential,
	ServiceAccountCredentialRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PasswordUtility } from '@/services/password.utility';
import { ServiceAccountCredentialService } from '@/services/service-account-credential.service';

describe('ServiceAccountCredentialService', () => {
	const repository = mock<ServiceAccountCredentialRepository>();
	const passwordUtility = mock<PasswordUtility>();
	const userRepository = mock<UserRepository>();
	const service = new ServiceAccountCredentialService(repository, passwordUtility, userRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createForUser', () => {
		it('hashes the secret, persists only the hash, and returns the raw secret once', async () => {
			const userId = 'user-1';
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: userId }));
			passwordUtility.hash.mockResolvedValue('hashed-secret');
			const persisted = mock<ServiceAccountCredential>({
				id: 'cred-1',
				userId,
				clientSecret: 'hashed-secret',
			});
			repository.findByClientId.mockResolvedValue(persisted);

			const { credential, rawClientSecret } = await service.createForUser(
				userId,
				'my label',
				'client_secret',
			);

			// The raw secret is what the hash was computed from, never the stored value.
			expect(passwordUtility.hash).toHaveBeenCalledWith(rawClientSecret);
			expect(rawClientSecret).not.toBe('hashed-secret');
			expect(rawClientSecret.length).toBeGreaterThan(0);

			// Only the hash is persisted.
			expect(repository.insertCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					userId,
					credentialType: 'client_secret',
					clientSecret: 'hashed-secret',
				}),
				{},
			);
			const [insertedArg] = repository.insertCredential.mock.calls[0];
			expect(insertedArg.clientSecret).not.toBe(rawClientSecret);

			expect(credential).toBe(persisted);
		});

		it('defaults the credential type to client_secret', async () => {
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: 'user-1' }));
			passwordUtility.hash.mockResolvedValue('hashed-secret');
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
