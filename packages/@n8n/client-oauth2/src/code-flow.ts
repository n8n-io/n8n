import { buildClientAssertion, CLIENT_ASSERTION_TYPE } from '@n8n/utils/client-assertion';
import * as qs from 'querystring';

import type { ClientOAuth2, ClientOAuth2Options } from './client-oauth2';
import type { ClientOAuth2Token } from './client-oauth2-token';
import { DEFAULT_HEADERS, DEFAULT_URL_BASE } from './constants';
import { auth, expects, getAuthError, getRequestOptions } from './utils';

interface CodeFlowBody {
	code: string | string[];
	grant_type: 'authorization_code';
	redirect_uri?: string;
	client_id?: string;
	resource?: string;
	client_assertion_type?: string;
	client_assertion?: string;
}

// Sent exactly once with the flow's value — a stale copy baked into the
// authorization URL would break the callback or PKCE validation.
const FLOW_OWNED_PARAMS = new Set([
	'client_id',
	'redirect_uri',
	'response_type',
	'state',
	'scope',
	'code_challenge',
	'code_challenge_method',
]);

// May legitimately repeat (RFC 8707 resource indicators), so never deduplicated.
const REPEATABLE_PARAMS = new Set(['resource']);

/**
 * Support authorization code OAuth 2.0 grant.
 *
 * Reference: http://tools.ietf.org/html/rfc6749#section-4.1
 */
export class CodeFlow {
	constructor(private client: ClientOAuth2) {}

	/**
	 * Generate the uri for doing the first redirect.
	 */
	getUri(opts?: Partial<ClientOAuth2Options>): string {
		const options: ClientOAuth2Options = { ...this.client.options, ...opts };

		// Check the required parameters are set.
		expects(options, 'clientId', 'authorizationUri');

		const url = new URL(options.authorizationUri);

		const queryParams: Record<string, string | string[] | undefined> = {
			...options.query,
			client_id: options.clientId,
			redirect_uri: options.redirectUri,
			response_type: 'code',
			state: options.state,
			...(options.resource ? { resource: options.resource } : {}),
			...(options.scopes ? { scope: options.scopes.join(options.scopesSeparator ?? ' ') } : {}),
		};

		for (const [key, value] of Object.entries(queryParams)) {
			if (value === null || value === undefined) continue;
			if (REPEATABLE_PARAMS.has(key)) {
				for (const entry of Array.isArray(value) ? value : [value]) {
					url.searchParams.append(key, entry);
				}
				continue;
			}
			const param = Array.isArray(value) ? value.join(',') : value;
			if (FLOW_OWNED_PARAMS.has(key)) {
				// An empty flow value (e.g. a blank scope) must not evict a URL-carried value.
				if (param === '' && url.searchParams.has(key)) continue;
				url.searchParams.set(key, param);
			} else if (!url.searchParams.has(key)) {
				// A key already on the URL is the user's explicit choice; our default falls back.
				url.searchParams.append(key, param);
			}
		}

		return url.toString();
	}

	/**
	 * Get the code token from the redirected uri and make another request for
	 * the user access token.
	 */
	async getToken(
		urlString: string,
		opts?: Partial<ClientOAuth2Options>,
	): Promise<ClientOAuth2Token> {
		const options: ClientOAuth2Options = { ...this.client.options, ...opts };
		expects(options, 'clientId', 'accessTokenUri');

		const url = new URL(urlString, DEFAULT_URL_BASE);
		if (
			typeof options.redirectUri === 'string' &&
			typeof url.pathname === 'string' &&
			url.pathname !== new URL(options.redirectUri, DEFAULT_URL_BASE).pathname
		) {
			throw new TypeError('Redirected path should match configured path, but got: ' + url.pathname);
		}

		if (!url.search?.substring(1)) {
			throw new TypeError(`Unable to process uri: ${urlString}`);
		}

		const data =
			typeof url.search === 'string' ? qs.parse(url.search.substring(1)) : url.search || {};

		// @ts-expect-error parsed query is loosely typed
		const error = getAuthError(data);
		if (error) throw error;

		if (options.state && data.state !== options.state) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			throw new TypeError(`Invalid state: ${data.state}`);
		}

		// Check whether the response code is set.
		if (!data.code) {
			throw new TypeError('Missing code, unable to request token');
		}

		const headers = { ...DEFAULT_HEADERS };
		const body: CodeFlowBody = {
			code: data.code,
			grant_type: 'authorization_code',
			redirect_uri: options.redirectUri,
			...(options.resource ? { resource: options.resource } : {}),
		};

		if (options.clientCredentialType === 'certificate') {
			expects(options, 'clientCertificate');
			body.client_id = options.clientId;
			body.client_assertion_type = CLIENT_ASSERTION_TYPE;
			body.client_assertion = buildClientAssertion({
				clientId: options.clientId,
				accessTokenUri: options.accessTokenUri,
				...options.clientCertificate,
			});
		} else if (options.clientSecret) {
			headers.Authorization = auth(options.clientId, options.clientSecret);
		} else {
			// `client_id`: REQUIRED if the client is not authenticating with the
			// authorization server. Reference: https://tools.ietf.org/html/rfc6749#section-3.2.1
			body.client_id = options.clientId;
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
