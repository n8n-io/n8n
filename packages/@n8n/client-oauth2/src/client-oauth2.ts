/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SsrfBridge } from '@n8n/backend-network';
import {
	createHttpProxyAgent,
	createHttpsProxyAgent,
	resolveProxyUrl,
} from '@n8n/backend-network/proxy';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
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
import { getAuthError, tryParseUrl } from './utils';

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
	/**
	 * Extra headers to send on the token request (e.g. a caller-identifying
	 * User-Agent). Only honored by the client-credentials grant today
	 * ({@link CredentialsFlow}); applied before it sets its own `Authorization`,
	 * so a caller can't use this to override the credential's auth header.
	 */
	headers?: Headers;
	/**
	 * When provided, token endpoint requests are validated against the host's
	 * outbound network policy before dispatch, at DNS resolution time, and on
	 * every redirect. Omit to leave the request unchecked. Narrowed to the
	 * methods this client uses so node-facing filters (`NodeEgressFilter`)
	 * qualify as well as the full bridge.
	 */
	ssrfBridge?: Pick<SsrfBridge, 'validateUrl' | 'validateRedirectSync' | 'createSecureLookup'>;
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
			// In the shipped artifact this package resolves its own axios copy, which
			// n8n's shared axios defaults (including the 300s timeout) do not reach —
			// so bound the request explicitly. Matches the shared default.
			timeout: 300_000,
			// Disable axios's built-in proxy handling; the agents built below own
			// env-proxy routing, avoiding double-proxying in corporate proxy-chain
			// environments.
			proxy: false,
		};

		const { ssrfBridge } = this.options;

		if (ssrfBridge) {
			const parsed = tryParseUrl(url);
			if (parsed) {
				const result = await ssrfBridge.validateUrl(parsed);
				if (!result.ok) throw result.error;
			}

			requestConfig.beforeRedirect = (redirected) => {
				ssrfBridge.validateRedirectSync(String(redirected.href));
			};
		}

		const proxyUrl = resolveProxyUrl(url);

		// Resolution is re-checked on the agent, so a hostname that resolves to a
		// different address between validation and connect is still caught. Only for
		// direct connections though: through a proxy the agent resolves the proxy host,
		// not the final target, so applying the lookup there would check the wrong host.
		const lookup = proxyUrl ? undefined : ssrfBridge?.createSecureLookup();

		// Agents are built per request whenever a proxy applies (not only for the
		// `lookup` and relaxed-TLS cases). Whether this package's axios shares the
		// instance that n8n's agent-injecting interceptor patches depends on package
		// layout: the shipped artifact materialises its own copy, so without these
		// agents a process lacking the global env-proxy agents connects directly and
		// bypasses the proxy.
		if (options.ignoreSSLIssues || lookup || proxyUrl) {
			requestConfig.httpsAgent = createHttpsProxyAgent(url, undefined, {
				...(options.ignoreSSLIssues ? { rejectUnauthorized: false } : {}),
				...(lookup ? { lookup } : {}),
			});
		}

		if (lookup || proxyUrl) {
			requestConfig.httpAgent = createHttpProxyAgent(url, undefined, {
				...(lookup ? { lookup } : {}),
			});
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
