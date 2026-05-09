import { CompactEncrypt, exportJWK, generateKeyPair, importJWK } from 'jose';
import type { CryptoKey } from 'jose';

import { decryptJweToken, decryptJweTokenData, isJweToken } from '../oauth-jwe.utils';

const ALG = 'RSA-OAEP-256';
const ENC = 'A256GCM';

async function makeJweToken(plaintext: string, publicKey: CryptoKey): Promise<string> {
	return await new CompactEncrypt(new TextEncoder().encode(plaintext))
		.setProtectedHeader({ alg: ALG, enc: ENC })
		.encrypt(publicKey);
}

let publicKey: CryptoKey;
let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
	const pair = await generateKeyPair(ALG, { extractable: true });
	publicKey = pair.publicKey;
	privateKey = pair.privateKey;

	const other = await generateKeyPair(ALG, { extractable: true });
	otherPrivateKey = other.privateKey;
});

describe('isJweToken', () => {
	it('returns true for a real compact-serialisation JWE', async () => {
		const token = await makeJweToken('hello', publicKey);

		expect(isJweToken(token)).toBe(true);
	});

	it('returns true for a 5-segment token with an empty encryptedKey segment', () => {
		// dir-style and other key-management algorithms produce an empty 2nd segment
		expect(isJweToken('a..b.c.d')).toBe(true);
	});

	it.each([
		['null', null],
		['undefined', undefined],
		['number', 42],
		['object', { foo: 'bar' }],
		['empty string', ''],
	])('returns false for %s', (_label, value) => {
		expect(isJweToken(value)).toBe(false);
	});

	it.each([
		['3-segment JWS', 'a.b.c'],
		['4-segment token', 'a.b.c.d'],
		['6-segment token', 'a.b.c.d.e.f'],
	])('returns false for %s', (_label, value) => {
		expect(isJweToken(value)).toBe(false);
	});
});

describe('decryptJweToken', () => {
	it('roundtrips a JWE through encrypt → decrypt', async () => {
		const token = await makeJweToken('payload-123', publicKey);

		const result = await decryptJweToken(token, privateKey);

		expect(result).toBe('payload-123');
	});

	it('throws when decrypted with the wrong private key', async () => {
		const token = await makeJweToken('payload', publicKey);

		await expect(decryptJweToken(token, otherPrivateKey)).rejects.toThrow();
	});

	it('throws on a malformed token', async () => {
		await expect(decryptJweToken('not.a.real.jwe.token', privateKey)).rejects.toThrow();
	});
});

describe('decryptJweTokenData', () => {
	it('decrypts both access_token and id_token when both are JWEs', async () => {
		const accessToken = await makeJweToken('plain-access', publicKey);
		const idToken = await makeJweToken('plain-id', publicKey);

		const result = await decryptJweTokenData(
			{ access_token: accessToken, id_token: idToken, token_type: 'Bearer' },
			privateKey,
		);

		expect(result.access_token).toBe('plain-access');
		expect(result.id_token).toBe('plain-id');
		expect(result.token_type).toBe('Bearer');
	});

	it('leaves non-JWE values untouched', async () => {
		const result = await decryptJweTokenData(
			{
				access_token: 'plain-jws.aaa.bbb',
				id_token: 12345,
				refresh_token: 'opaque-refresh-token',
			},
			privateKey,
		);

		expect(result.access_token).toBe('plain-jws.aaa.bbb');
		expect(result.id_token).toBe(12345);
		expect(result.refresh_token).toBe('opaque-refresh-token');
	});

	it('passes through when the JWE fields are missing', async () => {
		const result = await decryptJweTokenData({ token_type: 'Bearer' }, privateKey);

		expect(result).toEqual({ token_type: 'Bearer' });
	});

	it('does not mutate the input object', async () => {
		const accessToken = await makeJweToken('plain', publicKey);
		const input = { access_token: accessToken };

		await decryptJweTokenData(input, privateKey);

		expect(input.access_token).toBe(accessToken);
	});
});

describe('public/private JWK roundtrip', () => {
	it('an importable private JWK round-trips through decryptJweToken', async () => {
		const exported = await exportJWK(privateKey);
		const reimported = (await importJWK({ ...exported, alg: ALG }, ALG)) as CryptoKey;
		const token = await makeJweToken('roundtrip', publicKey);

		const plaintext = await decryptJweToken(token, reimported);

		expect(plaintext).toBe('roundtrip');
	});
});
