import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

interface OAuthTokenData extends IDataObject {
	access_token?: string;
	id_token?: string;
}

function base64UrlDecode(segment: string): string {
	const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
	const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
	return Buffer.from(padded + padding, 'base64').toString('utf8');
}

function decodeJwtPayload(jwt: string): IDataObject {
	const parts = jwt.split('.');
	if (parts.length !== 3) {
		throw new Error('Token is not a valid JWT (expected three dot-separated segments)');
	}
	const payload = JSON.parse(base64UrlDecode(parts[1])) as IDataObject;
	return payload;
}

export class MetaOAuth2Api implements ICredentialType {
	name = 'metaOAuth2Api';

	displayName = 'Meta OAuth2 API';

	extends = ['oAuth2Api'];

	documentationUrl = 'httprequest';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Encrypted Tokens (JWE)',
			name: 'jweEnabled',
			type: 'hidden',
			default: true,
		},
		{
			displayName: 'Bearer Claim',
			name: 'bearerClaim',
			type: 'string',
			default: 'internal_oauth_token',
			required: true,
			description:
				'Name of the claim inside the decrypted JWT whose value should be used as the bearer token sent to the API',
		},
	];

	/**
	 * preAuthentication runs on every request via the OAuth2 pipeline
	 * (initial + post-refresh). The IdP returns access_token as a JWE; the
	 * server decrypts it to a JWT before the token data reaches here. We
	 * decode the JWT payload, pull out the configured claim, and overwrite
	 * access_token in-memory so the OAuth2 signer sends the inner bearer.
	 */
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const tokenData = credentials.oauthTokenData as OAuthTokenData | undefined;
		if (!tokenData?.access_token) {
			return undefined;
		}

		const claimName = (credentials.bearerClaim as string) || 'internal_oauth_token';
		const payload = decodeJwtPayload(tokenData.access_token);
		const extracted = payload[claimName];

		if (typeof extracted !== 'string' || extracted.length === 0) {
			throw new Error(`Claim "${claimName}" not found in decrypted access token`);
		}

		return {
			oauthTokenData: {
				...tokenData,
				access_token: extracted,
			},
		};
	}
}
