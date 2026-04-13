import { CompactEncrypt, importJWK } from 'jose';

import { isJweToken, generateJweKeyPair, decryptJweToken, decryptJweTokenData } from '../jwe.utils';

describe('jwe.utils', () => {
	describe('isJweToken', () => {
		it('should return true for a token with 5 parts (JWE format)', () => {
			const jweToken = 'part1.part2.part3.part4.part5';
			expect(isJweToken(jweToken)).toBe(true);
		});

		it('should return false for a token with 3 parts (JWT format)', () => {
			const jwtToken = 'part1.part2.part3';
			expect(isJweToken(jwtToken)).toBe(false);
		});

		it('should return false for a plain string', () => {
			expect(isJweToken('some-opaque-token')).toBe(false);
		});

		it('should return false for an empty string', () => {
			expect(isJweToken('')).toBe(false);
		});
	});

	describe('generateJweKeyPair', () => {
		it('should generate a valid RSA-OAEP key pair', async () => {
			const { privateKey, publicKey } = await generateJweKeyPair('RSA-OAEP');

			const privateJwk = JSON.parse(privateKey);
			const publicJwk = JSON.parse(publicKey);

			expect(privateJwk.kty).toBe('RSA');
			expect(privateJwk.use).toBe('enc');
			expect(privateJwk.alg).toBe('RSA-OAEP');
			expect(privateJwk.d).toBeDefined(); // private key component

			expect(publicJwk.kty).toBe('RSA');
			expect(publicJwk.use).toBe('enc');
			expect(publicJwk.alg).toBe('RSA-OAEP');
			expect(publicJwk.d).toBeUndefined(); // no private key component
		});

		it('should generate a valid RSA-OAEP-256 key pair', async () => {
			const { privateKey, publicKey } = await generateJweKeyPair('RSA-OAEP-256');

			const privateJwk = JSON.parse(privateKey);
			const publicJwk = JSON.parse(publicKey);

			expect(privateJwk.kty).toBe('RSA');
			expect(privateJwk.alg).toBe('RSA-OAEP-256');
			expect(publicJwk.kty).toBe('RSA');
			expect(publicJwk.alg).toBe('RSA-OAEP-256');
		});

		it('should generate a valid ECDH-ES key pair', async () => {
			const { privateKey, publicKey } = await generateJweKeyPair('ECDH-ES');

			const privateJwk = JSON.parse(privateKey);
			const publicJwk = JSON.parse(publicKey);

			expect(privateJwk.kty).toBe('EC');
			expect(privateJwk.use).toBe('enc');
			expect(privateJwk.alg).toBe('ECDH-ES');
			expect(privateJwk.d).toBeDefined();

			expect(publicJwk.kty).toBe('EC');
			expect(publicJwk.d).toBeUndefined();
		});
	});

	describe('decryptJweToken', () => {
		it('should decrypt a JWE-encrypted token', async () => {
			const { privateKey, publicKey } = await generateJweKeyPair('RSA-OAEP');
			const originalToken = 'my-secret-access-token';

			// Encrypt using the public key
			const pubKey = await importJWK(JSON.parse(publicKey), 'RSA-OAEP');
			const jweToken = await new CompactEncrypt(new TextEncoder().encode(originalToken))
				.setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
				.encrypt(pubKey);

			const decrypted = await decryptJweToken(jweToken, privateKey);

			expect(decrypted).toBe(originalToken);
		});

		it('should fail with wrong private key', async () => {
			const { publicKey } = await generateJweKeyPair('RSA-OAEP');
			const { privateKey: wrongPrivateKey } = await generateJweKeyPair('RSA-OAEP');

			const pubKey = await importJWK(JSON.parse(publicKey), 'RSA-OAEP');
			const jweToken = await new CompactEncrypt(new TextEncoder().encode('secret'))
				.setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
				.encrypt(pubKey);

			await expect(decryptJweToken(jweToken, wrongPrivateKey)).rejects.toThrow();
		});
	});

	describe('decryptJweTokenData', () => {
		let privateKey: string;
		let publicKey: string;

		beforeAll(async () => {
			const keys = await generateJweKeyPair('RSA-OAEP');
			privateKey = keys.privateKey;
			publicKey = keys.publicKey;
		});

		const encryptToken = async (plaintext: string): Promise<string> => {
			const pubKey = await importJWK(JSON.parse(publicKey), 'RSA-OAEP');
			return await new CompactEncrypt(new TextEncoder().encode(plaintext))
				.setProtectedHeader({ alg: 'RSA-OAEP', enc: 'A256GCM' })
				.encrypt(pubKey);
		};

		it('should skip decryption when jweEnabled is false', async () => {
			const tokenData = { access_token: 'a.b.c.d.e' };
			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: false,
				jwePrivateKey: privateKey,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('a.b.c.d.e');
		});

		it('should skip decryption when jwePrivateKey is missing', async () => {
			const tokenData = { access_token: 'a.b.c.d.e' };
			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('a.b.c.d.e');
		});

		it('should decrypt JWE-encrypted access_token', async () => {
			const jweToken = await encryptToken('real-access-token');
			const tokenData: Record<string, unknown> = { access_token: jweToken };

			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jwePrivateKey: privateKey,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('real-access-token');
		});

		it('should decrypt JWE-encrypted id_token', async () => {
			const jweToken = await encryptToken('real-id-token');
			const tokenData: Record<string, unknown> = {
				access_token: 'plain-token',
				id_token: jweToken,
			};

			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jwePrivateKey: privateKey,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('plain-token');
			expect(tokenData.id_token).toBe('real-id-token');
		});

		it('should decrypt both access_token and id_token when both are JWE', async () => {
			const encryptedAccess = await encryptToken('decrypted-access');
			const encryptedId = await encryptToken('decrypted-id');
			const tokenData: Record<string, unknown> = {
				access_token: encryptedAccess,
				id_token: encryptedId,
			};

			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jwePrivateKey: privateKey,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('decrypted-access');
			expect(tokenData.id_token).toBe('decrypted-id');
		});

		it('should not touch non-JWE tokens', async () => {
			const tokenData: Record<string, unknown> = {
				access_token: 'plain-opaque-token',
				id_token: 'header.payload.signature',
			};

			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jwePrivateKey: privateKey,
				jweAlgorithm: 'RSA-OAEP',
			});

			expect(tokenData.access_token).toBe('plain-opaque-token');
			expect(tokenData.id_token).toBe('header.payload.signature');
		});

		it('should default to RSA-OAEP when jweAlgorithm is not set', async () => {
			const jweToken = await encryptToken('token-value');
			const tokenData: Record<string, unknown> = { access_token: jweToken };

			await decryptJweTokenData(tokenData, {
				clientId: 'id',
				accessTokenUrl: 'https://example.com/token',
				grantType: 'authorizationCode',
				jweEnabled: true,
				jwePrivateKey: privateKey,
			});

			expect(tokenData.access_token).toBe('token-value');
		});
	});
});
