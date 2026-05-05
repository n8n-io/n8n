import { mock } from 'jest-mock-extended';
import { CompactEncrypt, generateKeyPair } from 'jose';
import type { CryptoKey } from 'jose';
import { UserError } from 'n8n-workflow';

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
		service = new OAuthJweDecryptService(keyService);
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
});
