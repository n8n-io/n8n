import type { CryptoKey } from 'jose';
import { compactDecrypt } from 'jose';

const JWE_SEGMENT_COUNT = 5;

/**
 * Returns true if the value is a compact-serialisation JWE token:
 * five dot-separated segments (header.encryptedKey.iv.ciphertext.tag).
 * The `encryptedKey` segment may be empty for key-management algorithms
 * such as `dir`. Cheap prefilter; does not parse or validate the token.
 */
export function isJweToken(token: unknown): token is string {
	if (typeof token !== 'string' || token.length === 0) return false;
	return token.split('.').length === JWE_SEGMENT_COUNT;
}

/**
 * Decrypts a compact-serialisation JWE token and returns the plaintext payload
 * as a UTF-8 string. The caller is responsible for any further handling
 * (e.g. verifying an inner JWT).
 */
export async function decryptJweToken(token: string, privateKey: CryptoKey): Promise<string> {
	const { plaintext } = await compactDecrypt(token, privateKey);
	return new TextDecoder().decode(plaintext);
}

/**
 * Returns a shallow copy of the token response data with `access_token` and
 * `id_token` decrypted if they are JWE tokens. Non-JWE values are passed
 * through unchanged.
 */
export async function decryptJweTokenData(
	data: Record<string, unknown>,
	privateKey: CryptoKey,
): Promise<Record<string, unknown>> {
	const result: Record<string, unknown> = { ...data };

	for (const field of ['access_token', 'id_token'] as const) {
		const value = result[field];
		if (isJweToken(value)) {
			result[field] = await decryptJweToken(value, privateKey);
		}
	}

	return result;
}
