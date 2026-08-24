import type { GitKeyGeneratorType } from '@n8n/api-types';

import type { GitAuthMaterial, GitAuthResult } from '../git-connections-auth.utils';
import { computeAuthenticationUpdate, emptyGitAuthMaterial } from '../git-connections-auth.utils';

describe('computeAuthenticationUpdate', () => {
	const generateSshKeyPair =
		vi.fn<(keyType: GitKeyGeneratorType) => Promise<{ publicKey: string; privateKey: string }>>();
	const encrypt = vi.fn<(value: string) => Promise<string>>();
	const deps = { generateSshKeyPair, encrypt };

	beforeEach(() => {
		vi.clearAllMocks();
		generateSshKeyPair.mockResolvedValue({ publicKey: 'PUB', privateKey: 'PRIV' });
		encrypt.mockImplementation(async (value) => `enc:${value}`);
	});

	const sshCurrent = (): GitAuthMaterial => ({
		...emptyGitAuthMaterial(),
		connectionType: 'ssh',
		publicKey: 'PUB',
		encryptedPrivateKey: 'enc:PRIV',
		keyGeneratorType: 'ed25519',
	});

	const httpsCurrent = (): GitAuthMaterial => ({
		...emptyGitAuthMaterial(),
		connectionType: 'https',
		encryptedUsername: 'enc:user',
		encryptedPassword: 'enc:pass',
	});

	describe('no connection type in play', () => {
		it('returns null when nothing is set or being set', async () => {
			const result = await computeAuthenticationUpdate(emptyGitAuthMaterial(), {}, deps);
			expect(result).toBeNull();
			expect(generateSshKeyPair).not.toHaveBeenCalled();
		});

		it('throws when auth material is provided without a connection type', async () => {
			await expect(
				computeAuthenticationUpdate(
					emptyGitAuthMaterial(),
					{ username: 'user', password: 'pass' },
					deps,
				),
			).rejects.toThrow('Connection type is required to set authentication');
		});
	});

	describe('SSH', () => {
		it('rejects username/password for an SSH connection', async () => {
			await expect(
				computeAuthenticationUpdate(
					emptyGitAuthMaterial(),
					{ connectionType: 'ssh', username: 'user', password: 'pass' },
					deps,
				),
			).rejects.toThrow('Username and password are only valid for HTTPS connections');
		});

		it('returns null when already SSH and the key type is unchanged', async () => {
			const result = await computeAuthenticationUpdate(
				sshCurrent(),
				{ connectionType: 'ssh' },
				deps,
			);
			expect(result).toBeNull();
			expect(generateSshKeyPair).not.toHaveBeenCalled();
		});

		it('rejects changing the SSH key type after creation', async () => {
			await expect(
				computeAuthenticationUpdate(
					sshCurrent(),
					{ connectionType: 'ssh', keyGeneratorType: 'rsa' },
					deps,
				),
			).rejects.toThrow('SSH key type cannot be changed after creation');
		});

		it('generates an ed25519 key pair by default on first-time SSH', async () => {
			const result = await computeAuthenticationUpdate(
				emptyGitAuthMaterial(),
				{ connectionType: 'ssh' },
				deps,
			);
			expect(generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			expect(result).toEqual({
				connectionType: 'ssh',
				publicKey: 'PUB',
				encryptedPrivateKey: 'enc:PRIV',
				keyGeneratorType: 'ed25519',
				encryptedUsername: null,
				encryptedPassword: null,
			});
		});

		it('generates a fresh key pair and clears credentials when switching from HTTPS', async () => {
			const result = await computeAuthenticationUpdate(
				httpsCurrent(),
				{ connectionType: 'ssh' },
				deps,
			);
			expect(generateSshKeyPair).toHaveBeenCalledWith('ed25519');
			expect(result).toMatchObject({
				connectionType: 'ssh',
				encryptedUsername: null,
				encryptedPassword: null,
			});
		});

		it('uses the requested key type on first-time SSH', async () => {
			await computeAuthenticationUpdate(
				emptyGitAuthMaterial(),
				{ connectionType: 'ssh', keyGeneratorType: 'rsa' },
				deps,
			);
			expect(generateSshKeyPair).toHaveBeenCalledWith('rsa');
		});
	});

	describe('HTTPS', () => {
		it('rejects a key generator type for an HTTPS connection', async () => {
			await expect(
				computeAuthenticationUpdate(
					emptyGitAuthMaterial(),
					{ connectionType: 'https', keyGeneratorType: 'rsa' },
					deps,
				),
			).rejects.toThrow('Key generator type is only valid for SSH connections');
		});

		it('requires credentials when first configuring HTTPS', async () => {
			await expect(
				computeAuthenticationUpdate(emptyGitAuthMaterial(), { connectionType: 'https' }, deps),
			).rejects.toThrow('HTTPS username and password must be provided together');
		});

		it('encrypts credentials and clears SSH fields', async () => {
			const result = await computeAuthenticationUpdate(
				sshCurrent(),
				{ connectionType: 'https', username: 'user', password: 'pass' },
				deps,
			);
			expect(encrypt).toHaveBeenCalledWith('user');
			expect(encrypt).toHaveBeenCalledWith('pass');
			expect(result).toEqual({
				connectionType: 'https',
				encryptedUsername: 'enc:user',
				encryptedPassword: 'enc:pass',
				publicKey: null,
				encryptedPrivateKey: null,
				keyGeneratorType: null,
			});
		});

		it('preserves existing credentials when already HTTPS and none are provided', async () => {
			const result = await computeAuthenticationUpdate(
				httpsCurrent(),
				{ connectionType: 'https' },
				deps,
			);
			expect(encrypt).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				connectionType: 'https',
				encryptedUsername: 'enc:user',
				encryptedPassword: 'enc:pass',
			});
		});

		it('rejects a username without a password', async () => {
			await expect(
				computeAuthenticationUpdate(
					emptyGitAuthMaterial(),
					{ connectionType: 'https', username: 'user' },
					deps,
				),
			).rejects.toThrow('HTTPS username and password must be provided together');
		});

		it('rejects credentials containing control characters', async () => {
			await expect(
				computeAuthenticationUpdate(
					emptyGitAuthMaterial(),
					{ connectionType: 'https', username: 'user', password: 'pa\nss' },
					deps,
				),
			).rejects.toThrow('HTTPS credentials contain unsupported characters');
		});
	});

	describe('type contract', () => {
		// Regression guard for the nullability hole: the helper's return type has a
		// non-nullable connectionType, so a future edit that produces a null
		// connectionType (which callers Object.assign onto the entity's non-nullable
		// column) is a compile error rather than a silent bad write.
		it('rejects a null connectionType in the computed result at compile time', () => {
			const result: GitAuthResult = {
				// @ts-expect-error connectionType is non-nullable; null must not typecheck.
				connectionType: null,
				publicKey: null,
				encryptedPrivateKey: null,
				encryptedUsername: null,
				encryptedPassword: null,
				keyGeneratorType: null,
			};

			expect(result.connectionType).toBeNull();
		});
	});
});
