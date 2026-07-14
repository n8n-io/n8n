/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent } from 'https';
import * as qs from 'querystring';

import type { ClientOAuth2TokenData } from './client-oauth2-token';
import { ClientOAuth2Token } from './client-oauth2-token';
import { CodeFlow } from './code-flow';
import { CredentialsFlow } from './credentials-flow';
import type {
	ClientCertificate,
	Headers,
	OAuth2AccessTokenErrorResponse,
	OAuth2AuthenticationMethod,
	OAuth2ClientCredentialType,
} from './types';
import { getAuthError } from './utils';

export interface ClientOAuth2RequestObject {
	url: string;
	method: 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
	body?: Record<string, any>;
	query?: qs.ParsedUrlQuery;
	headers?: Headers;
	ignoreSSLIssues?: boolean;
}

export interface ClientOAuth2Options {
	clientId: string;
	clientCredentialType?: OAuth2ClientCredentialType;
	clientSecret?: string;
	clientCertificate?: ClientCertificate;
	accessTokenUri: string;
	authentication?: OAuth2AuthenticationMethod;
	authorizationUri?: string;
	redirectUri?: string;
	scopes?: string[];
	scopesSeparator?: ',' | ' ';
	authorizationGrants?: string[];
	state?: string;
	additionalBodyProperties?: Record<string, any>;
	body?: Record<string, any>;
	query?: qs.ParsedUrlQuery;
	resource?: string;
	ignoreSSLIssues?: boolean;
}

export class ResponseError extends Error {
	constructor(
		readonly status: number,
		readonly body: unknown,
		readonly code = 'ESTATUS',
		readonly message = `HTTP status ${status}`,
	) {
		super(message);
	}
}

const sslIgnoringAgent = new Agent({ rejectUnauthorized: false });

/**
 * Construct an object that can handle the multiple OAuth 2.0 flows.
 */
export class ClientOAuth2 {
	code: CodeFlow;

	credentials: CredentialsFlow;

	constructor(readonly options: ClientOAuth2Options) {
		this.code = new CodeFlow(this);
		this.credentials = new CredentialsFlow(this);
	}

	/**
	 * Create a new token from existing data.
	 */
	createToken(data: ClientOAuth2TokenData, type?: string): ClientOAuth2Token {
		return new ClientOAuth2Token(this, {
			...data,
			...(typeof type === 'string' ? { token_type: type } : type),
		});
	}

	/**
	 * Request an access token from the OAuth2 server.
	 *
	 * @throws {ResponseError} If the response is an unexpected status code.
	 * @throws {AuthError} If the response is an authentication error.
	 */
	async accessTokenRequest(options: ClientOAuth2RequestObject): Promise<ClientOAuth2TokenData> {
		let url = options.url;
		const query = qs.stringify(options.query);

		if (query) {
			url += (url.indexOf('?') === -1 ? '?' : '&') + query;
		}

		const requestConfig: AxiosRequestConfig = {
			url,
			method: options.method,
			data: qs.stringify(options.body),
			headers: options.headers,
			transformResponse: (res: unknown) => res,
			// Axios rejects the promise by default for all status codes 4xx.
			// We override this to reject promises only on 5xxs
			validateStatus: (status) => status < 500,
			// Disable axios's built-in proxy handling so requests are routed
			// through n8n's global proxy agents (HttpProxyManager / HttpsProxyManager)
			// instead of being double-proxied in corporate proxy-chain environments.
			proxy: false,
		};

		if (options.ignoreSSLIssues) {
			requestConfig.httpsAgent = sslIgnoringAgent;
		}

		const response = await axios.request(requestConfig);

		if (response.status >= 400) {
			const body = this.parseResponseBody<OAuth2AccessTokenErrorResponse>(response);
			const authErr = getAuthError(body);

			if (authErr) throw authErr;
			else throw new ResponseError(response.status, response.data);
		}

		if (response.status >= 300) {
			throw new ResponseError(response.status, response.data);
		}

		return this.parseResponseBody<ClientOAuth2TokenData>(response);
	}

	/**
	 * Attempt to parse response body based on the content type.
	 */
	private parseResponseBody<T extends object>(response: AxiosResponse<unknown>): T {
		const contentType = (response.headers['content-type'] as string) ?? '';
		const body = response.data as string;

		if (contentType.startsWith('application/x-www-form-urlencoded')) {
			return qs.parse(body) as T;
		}

		// RFC 6749 §5.1 mandates a JSON body, not a JSON content-type header.
		// Parse by body shape so providers that mislabel JSON (e.g. text/plain) still work.
		try {
			return JSON.parse(body) as T;
		} catch {
			const preview = body.length > 100 ? body.slice(0, 100) + '...' : body;
			throw new ResponseError(
				response.status,
				body,
				undefined,
				`Expected JSON response from OAuth2 token endpoint (content-type: ${contentType || 'none'}) but received: ${preview}`,
			);
		}
	}
}
