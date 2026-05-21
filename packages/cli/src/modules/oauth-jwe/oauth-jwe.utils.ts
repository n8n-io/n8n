import type { CryptoKey } from 'jose';
import { compactDecrypt, errors as joseErrors } from 'jose';
import { UserError } from 'n8n-workflow';

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
 *
 * Wraps jose's {@link joseErrors.JOSENotSupported} into a domain-specific
 * {@link UserError} that surfaces the offending header so the admin sees an
 * actionable "re-register at the IdP" message instead of a generic library
 * error. Other jose errors (bad key, malformed token) propagate unchanged.
 */
export async function decryptJweToken(token: string, privateKey: CryptoKey): Promise<string> {
	try {
		const { plaintext } = await compactDecrypt(token, privateKey);
		return new TextDecoder().decode(plaintext);
	} catch (error) {
		if (error instanceof joseErrors.JOSENotSupported) {
			throw new UserError(
				`Cannot decrypt token: ${error.message}${formatHeaderHint(token)}. Re-register the client at the IdP with a standard JWE algorithm (RFC 7518).`,
			);
		}
		throw error;
	}
}

function formatHeaderHint(token: string): string {
	const [headerSegment] = token.split('.');
	let header: { alg?: unknown; enc?: unknown };
	try {
		header = JSON.parse(Buffer.from(headerSegment, 'base64url').toString('utf8')) as typeof header;
	} catch {
		return '';
	}
	const parts: string[] = [];
	if (typeof header.alg === 'string') parts.push(`alg="${header.alg}"`);
	if (typeof header.enc === 'string') parts.push(`enc="${header.enc}"`);
	return parts.length ? ` (${parts.join(', ')})` : '';
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
