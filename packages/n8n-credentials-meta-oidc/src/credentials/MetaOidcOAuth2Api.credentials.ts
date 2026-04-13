import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Custom OAuth2 credential for Meta's OIDC provider.
 *
 * Meta's token endpoint returns JWE-encrypted nested JWTs (JWS inside JWE).
 * After n8n's generic JWE decryption (from OAuth2Api), the access_token is a
 * signed JWT whose payload contains a custom `intern_oauth_token` claim — the
 * actual Bearer token to use for API calls.
 *
 * This credential uses preAuthentication to extract that claim and replace
 * the access_token before requests are signed.
 *
 * Requirements:
 * - n8n >= X.Y.Z (with JWE decryption support and preAuthentication in OAuth2 pipeline)
 */
export class MetaOidcOAuth2Api implements ICredentialType {
	name = 'metaOidcOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Meta OIDC OAuth2 API';

	icon = 'file:../icons/meta.svg' as const;

	genericAuth = true;

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'JWE Token Decryption',
			name: 'jweEnabled',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Key Encryption Algorithm',
			name: 'jweAlgorithm',
			type: 'hidden',
			default: 'RSA-OAEP',
		},
		{
			displayName: 'Content Encryption Algorithm',
			name: 'jweEncryption',
			type: 'hidden',
			default: 'A256GCM',
		},
		{
			displayName: 'Access Token Claim',
			name: 'accessTokenClaim',
			type: 'string',
			default: 'intern_oauth_token',
			description: 'The claim name inside the decrypted JWT that contains the actual Bearer token',
		},
		{
			displayName: 'Extracted Access Token',
			name: 'extractedAccessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	];

	async preAuthentication(
		this: unknown,
		credentials: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const oauthTokenData = credentials.oauthTokenData as Record<string, unknown> | undefined;
		if (!oauthTokenData?.access_token || typeof oauthTokenData.access_token !== 'string') {
			return {};
		}

		const accessToken = oauthTokenData.access_token;
		const claimName = (credentials.accessTokenClaim as string) || 'intern_oauth_token';

		// Check if the access_token is a JWT (3 dot-separated parts)
		const parts = accessToken.split('.');
		if (parts.length !== 3) {
			// Not a JWT — use as-is
			return { extractedAccessToken: accessToken };
		}

		// Decode the JWT payload (middle part) without verification.
		// Signature verification is the resource server's responsibility.
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

		const extractedToken = payload[claimName];
		if (typeof extractedToken !== 'string') {
			// Claim not found — fall back to the raw access_token
			return { extractedAccessToken: accessToken };
		}

		// Replace access_token in oauthTokenData so the OAuth2 request pipeline uses it
		return {
			extractedAccessToken: extractedToken,
			oauthTokenData: {
				...oauthTokenData,
				access_token: extractedToken,
			},
		};
	}
}
