import type { OAuth2CredentialData } from '@n8n/client-oauth2';

/**
 * Checks if a token string is a JWE compact serialization.
 * JWE tokens have 5 Base64url-encoded parts separated by dots,
 * while JWS/JWT tokens have 3.
 */
export function isJweToken(token: string): boolean {
	return typeof token === 'string' && token.split('.').length === 5;
}

/**
 * Generates a JWE key pair (public + private) for the given algorithm.
 * Returns both keys in JWK format as JSON strings.
 */
export async function generateJweKeyPair(algorithm: string): Promise<{
	privateKey: string;
	publicKey: string;
}> {
	const { generateKeyPair, exportJWK, calculateJwkThumbprint } = await import('jose');
	const { publicKey, privateKey } = await generateKeyPair(algorithm, {
		extractable: true,
	});

	const publicJwk = await exportJWK(publicKey);
	const kid = await calculateJwkThumbprint(publicJwk);
	publicJwk.use = 'enc';
	publicJwk.alg = algorithm;
	publicJwk.kid = kid;

	const privateJwk = await exportJWK(privateKey);
	privateJwk.use = 'enc';
	privateJwk.alg = algorithm;
	privateJwk.kid = kid;

	return {
		privateKey: JSON.stringify(privateJwk),
		publicKey: JSON.stringify(publicJwk),
	};
}

/**
 * Decrypts a JWE-encrypted token string using the credential's private key.
 */
export async function decryptJweToken(token: string, privateKeyJwk: string): Promise<string> {
	const { compactDecrypt, importJWK } = await import('jose');
	// The JWK already contains the `alg` property, so no need to pass it separately
	const privateKey = await importJWK(JSON.parse(privateKeyJwk));
	const { plaintext } = await compactDecrypt(token, privateKey);
	return new TextDecoder().decode(plaintext);
}

/**
 * Decrypts JWE-encrypted fields in the OAuth token data if JWE is enabled.
 * Mutates the tokenData object in place.
 */
export async function decryptJweTokenData(
	tokenData: Record<string, unknown>,
	oauthCredentials: OAuth2CredentialData,
): Promise<void> {
	if (!oauthCredentials.jweEnabled || !oauthCredentials.jwePrivateKey) {
		return;
	}

	if (typeof tokenData.access_token === 'string' && isJweToken(tokenData.access_token)) {
		tokenData.access_token = await decryptJweToken(
			tokenData.access_token,
			oauthCredentials.jwePrivateKey,
		);
	}

	if (typeof tokenData.id_token === 'string' && isJweToken(tokenData.id_token)) {
		tokenData.id_token = await decryptJweToken(tokenData.id_token, oauthCredentials.jwePrivateKey);
	}
}
