import type { ClientOAuth2 } from './client-oauth2';
import type { ClientOAuth2Token } from './client-oauth2-token';
import { DEFAULT_HEADERS } from './constants';
import type { Headers } from './types';
import { auth, expects, getRequestOptions } from './utils';

interface CredentialsFlowBody {
	client_id?: string;
	client_secret?: string;
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
	async getToken(): Promise<ClientOAuth2Token> {
		const options = { ...this.client.options };
		expects(options, 'clientId', 'clientSecret', 'accessTokenUri');

		const headers: Headers = { ...DEFAULT_HEADERS };
		const body: CredentialsFlowBody = {
			grant_type: 'client_credentials',
			...(options.additionalBodyProperties ?? {}),
		};

		if (options.scopes !== undefined) {
			body.scope = options.scopes.join(options.scopesSeparator ?? ' ');
		}

		const clientId = options.clientId;
		const clientSecret = options.clientSecret;

		if (options.authentication === 'body') {
			body.client_id = clientId;
			body.client_secret = clientSecret;
		} else {
			headers.Authorization = auth(clientId, clientSecret);
		}

		const requestOptions = getRequestOptions(
			{
				url: options.accessTokenUri,
				method: 'POST',
				headers,
				body,
			},
			options,
		);

		const responseData = await this.client.accessTokenRequest(requestOptions);
		return this.client.createToken({ ...responseData, grant_type: 'client_credentials' });
	}
}
