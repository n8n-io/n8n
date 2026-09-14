import { CompactEncrypt, generateKeyPair } from 'jose';
import type { CryptoKey } from 'jose';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@/services/url.service';

import { OAuthJweDecryptService } from '../oauth-jwe-decrypt.service';
import type { OAuthJweKeyService } from '../oauth-jwe-key.service';

const ALG = 'RSA-OAEP-256';
const ENC = 'A256GCM';

async function makeJweToken(plaintext: string, publicKey: CryptoKey): Promise<string> {
	return await new CompactEncrypt(new TextEncoder().encode(plaintext))
		.setProtectedHeader({ alg: ALG, enc: ENC })
		.encrypt(publicKey);
}

describe('OAuthJweDecryptService', () => {
	let publicKey: CryptoKey;
	let privateKey: CryptoKey;
	let service: OAuthJweDecryptService;

	beforeAll(async () => {
		const pair = await generateKeyPair(ALG, { extractable: true });
		publicKey = pair.publicKey;
		privateKey = pair.privateKey;
	});

	beforeEach(() => {
		const keyService = mock<OAuthJweKeyService>();
		keyService.getKeyPair.mockResolvedValue({
			algorithm: ALG,
			privateKey,
			publicKey,
			publicJwk: {},
			kid: 'kid-1',
		});
		service = new OAuthJweDecryptService(keyService, mock<UrlService>());
	});

	it('decrypts both access_token and id_token when both are JWEs', async () => {
		const accessToken = await makeJweToken('plain-access', publicKey);
		const idToken = await makeJweToken('plain-id', publicKey);

		const result = await service.decryptOAuth2TokenData({
			access_token: accessToken,
			id_token: idToken,
			token_type: 'Bearer',
		});

		expect(result.access_token).toBe('plain-access');
		expect(result.id_token).toBe('plain-id');
		expect(result.token_type).toBe('Bearer');
	});

	it('rejects when every present token field is plaintext', async () => {
		await expect(
			service.decryptOAuth2TokenData({ access_token: 'opaque-plaintext', token_type: 'Bearer' }),
		).rejects.toThrow(UserError);
		await expect(
			service.decryptOAuth2TokenData({ access_token: 'opaque-plaintext', id_token: 'a.b.c' }),
		).rejects.toThrow('Expected at least one JWE-encrypted token but received only plaintext');
	});

	it('accepts a mix where one token is JWE and the other is plaintext', async () => {
		// e.g. opaque access_token + JWE-wrapped id_token — common with OIDC IdPs
		const idToken = await makeJweToken('plain-id', publicKey);

		const result = await service.decryptOAuth2TokenData({
			access_token: 'opaque-access',
			id_token: idToken,
		});

		expect(result.access_token).toBe('opaque-access');
		expect(result.id_token).toBe('plain-id');
	});

	it('passes through when neither access_token nor id_token is present', async () => {
		const result = await service.decryptOAuth2TokenData({
			token_type: 'Bearer',
			expires_in: 3600,
		});

		expect(result).toEqual({ token_type: 'Bearer', expires_in: 3600 });
	});

	it('does not mutate the input object', async () => {
		const accessToken = await makeJweToken('plain', publicKey);
		const input = { access_token: accessToken };

		await service.decryptOAuth2TokenData(input);

		expect(input.access_token).toBe(accessToken);
	});

	it('throws when the JWE is malformed', async () => {
		await expect(service.decryptOAuth2TokenData({ access_token: 'a.b.c.d.e' })).rejects.toThrow();
	});

	describe('getDcrJweFields', () => {
		const JWKS_URI = 'http://localhost:5678/rest/.well-known/jwks.json';
		const PUBLIC_JWK = { kty: 'RSA', alg: ALG, kid: 'kid-active', n: 'n', e: 'AQAB' };

		function buildService(jwk: Record<string, string> = PUBLIC_JWK) {
			const keyService = mock<OAuthJweKeyService>();
			keyService.getPublicJwk.mockResolvedValue(jwk);
			const urlService = mock<UrlService>();
			urlService.getInstanceJwksUri.mockReturnValue(JWKS_URI);
			return new OAuthJweDecryptService(keyService, urlService);
		}

		it('returns jwks_uri (not jwks) when inlineJwks is false', async () => {
			const localService = buildService();

			const fields = await localService.getDcrJweFields(false);

			expect(fields).toEqual({
				jwks_uri: JWKS_URI,
				id_token_encrypted_response_alg: ALG,
			});
			expect(fields).not.toHaveProperty('jwks');
		});

		it('returns jwks (not jwks_uri) when inlineJwks is true', async () => {
			const localService = buildService();

			const fields = await localService.getDcrJweFields(true);

			expect(fields).toEqual({
				jwks: { keys: [PUBLIC_JWK] },
				id_token_encrypted_response_alg: ALG,
			});
			expect(fields).not.toHaveProperty('jwks_uri');
		});

		it('uses whatever alg the active key advertises', async () => {
			const localService = buildService({
				kty: 'EC',
				alg: 'ECDH-ES+A256KW',
				kid: 'kid-ec',
				crv: 'P-256',
				x: 'x',
				y: 'y',
			});

			const fields = await localService.getDcrJweFields(false);

			expect(fields.id_token_encrypted_response_alg).toBe('ECDH-ES+A256KW');
		});

		it('throws when the active key has no alg', async () => {
			const keyService = mock<OAuthJweKeyService>();
			keyService.getPublicJwk.mockResolvedValue({
				kty: 'RSA',
				kid: 'kid-no-alg',
				n: 'n',
				e: 'AQAB',
			});
			const localService = new OAuthJweDecryptService(keyService, mock<UrlService>());

			await expect(localService.getDcrJweFields(false)).rejects.toThrow(UnexpectedError);
			await expect(localService.getDcrJweFields(false)).rejects.toThrow(
				'OAuth JWE public key is missing an "alg" field',
			);
		});
	});
});
