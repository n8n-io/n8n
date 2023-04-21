import type { ClientOAuth2, ClientOAuth2Options } from './ClientOAuth2';
import type { ClientOAuth2Token, ClientOAuth2TokenData } from './ClientOAuth2Token';
import { DEFAULT_HEADERS } from './constants';
import { auth, expects, requestOptions, sanitizeScope } from './utils';

interface CredentialsFlowBody {
	grant_type: 'client_credentials';
	scope?: string;
}

/**
 * Support client credentials OAuth 2.0 grant.
 *
 * Reference: http://tools.ietf.org/html/rfc6749#section-4.4
 */
export class CredentialsFlow {
	constructor(private client: ClientOAuth2) {}

	/**
	 * Request an access token using the client credentials.
	 */
	async getToken(opts?: ClientOAuth2Options): Promise<ClientOAuth2Token> {
		const options = { ...this.client.options, ...opts };

		expects(options, 'clientId', 'clientSecret', 'accessTokenUri');

		const body: CredentialsFlowBody = {
			grant_type: 'client_credentials',
		};

		if (options.scopes !== undefined) {
			body.scope = sanitizeScope(options.scopes);
		}

		const responseData = await this.client.request<ClientOAuth2TokenData>(
			requestOptions(
				{
					url: options.accessTokenUri,
					method: 'POST',
					headers: {
						...DEFAULT_HEADERS,
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Authorization: auth(options.clientId, options.clientSecret),
					},
					body,
				},
				options,
			),
		);
		return this.client.createToken(responseData);
	}
}
