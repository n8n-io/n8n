/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
import * as qs from 'querystring';

import type { ClientOAuth2TokenData } from './ClientOAuth2Token';
import { ClientOAuth2Token } from './ClientOAuth2Token';
import { CodeFlow } from './CodeFlow';
import { CredentialsFlow } from './CredentialsFlow';
import type { Headers } from './types';
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
	clientSecret?: string;
	accessTokenUri: string;
	authentication?: 'header' | 'body';
	authorizationUri?: string;
	redirectUri?: string;
	scopes?: string[];
	scopesSeparator?: ',' | ' ';
	authorizationGrants?: string[];
	state?: string;
	body?: Record<string, any>;
	query?: qs.ParsedUrlQuery;
	ignoreSSLIssues?: boolean;
}

class ResponseError extends Error {
	constructor(
		readonly status: number,
		readonly body: object,
		readonly code = 'ESTATUS',
	) {
		super(`HTTP status ${status}`);
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
	 * Attempt to parse response body as JSON, fall back to parsing as a query string.
	 */
	private parseResponseBody<T extends object>(body: string): T {
		try {
			return JSON.parse(body);
		} catch (e) {
			return qs.parse(body) as T;
		}
	}

	/**
	 * Using the built-in request method, we'll automatically attempt to parse
	 * the response.
	 */
	async request<T extends object>(options: ClientOAuth2RequestObject): Promise<T> {
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
			transformResponse: (res) => res,
			// Axios rejects the promise by default for all status codes 4xx.
			// We override this to reject promises only on 5xxs
			validateStatus: (status) => status < 500,
		};

		if (options.ignoreSSLIssues) {
			requestConfig.httpsAgent = sslIgnoringAgent;
		}

		const response = await axios.request(requestConfig);

		const body = this.parseResponseBody<T>(response.data);

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const authErr = getAuthError(body);
		if (authErr) throw authErr;

		if (response.status < 200 || response.status >= 399)
			throw new ResponseError(response.status, response.data);

		return body;
	}
}
