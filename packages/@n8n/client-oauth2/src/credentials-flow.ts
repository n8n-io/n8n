import { buildClientAssertion, CLIENT_ASSERTION_TYPE } from './client-assertion';
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
	client_assertion_type?: string;
	client_assertion?: string;
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
		expects(options, 'clientId', 'accessTokenUri');

		const headers: Headers = { ...DEFAULT_HEADERS };
		const body: CredentialsFlowBody = {
			grant_type: 'client_credentials',
			...(options.additionalBodyProperties ?? {}),
		};

		if (options.scopes !== undefined) {
			body.scope = options.scopes.join(options.scopesSeparator ?? ' ');
		}

		const { clientId } = options;

		if (options.clientCredentialType === 'certificate') {
			expects(options, 'clientCertificate');
			body.client_id = clientId;
			body.client_assertion_type = CLIENT_ASSERTION_TYPE;
			body.client_assertion = buildClientAssertion({
				clientId,
				accessTokenUri: options.accessTokenUri,
				...options.clientCertificate,
			});
		} else {
			expects(options, 'clientSecret');
			if (options.authentication === 'body') {
				body.client_id = clientId;
				body.client_secret = options.clientSecret;
			} else {
				headers.Authorization = auth(clientId, options.clientSecret);
			}
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
		return this.client.createToken(responseData);
	}
}
