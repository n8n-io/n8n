/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import type { ClientOAuth2, ClientOAuth2Options, ClientOAuth2RequestObject } from './ClientOAuth2';
import { auth, getRequestOptions } from './utils';
import { DEFAULT_HEADERS } from './constants';

export interface ClientOAuth2TokenData extends Record<string, string | undefined> {
	token_type?: string | undefined;
	access_token: string;
	refresh_token: string;
	expires_in?: string;
	scope?: string | undefined;
}
/**
 * General purpose client token generator.
 */
export class ClientOAuth2Token {
	readonly tokenType?: string;

	readonly accessToken: string;

	readonly refreshToken: string;

	private expires: Date;

	constructor(readonly client: ClientOAuth2, readonly data: ClientOAuth2TokenData) {
		this.tokenType = data.token_type?.toLowerCase() ?? 'bearer';
		this.accessToken = data.access_token;
		this.refreshToken = data.refresh_token;

		this.expires = new Date();
		this.expires.setSeconds(this.expires.getSeconds() + Number(data.expires_in));
	}

	/**
	 * Sign a standardized request object with user authentication information.
	 */
	sign(requestObject: ClientOAuth2RequestObject): ClientOAuth2RequestObject {
		if (!this.accessToken) {
			throw new Error('Unable to sign without access token');
		}

		requestObject.headers = requestObject.headers ?? {};

		if (this.tokenType === 'bearer') {
			requestObject.headers.Authorization = 'Bearer ' + this.accessToken;
		} else {
			const parts = requestObject.url.split('#');
			const token = 'access_token=' + this.accessToken;
			const url = parts[0].replace(/[?&]access_token=[^&#]/, '');
			const fragment = parts[1] ? '#' + parts[1] : '';

			// Prepend the correct query string parameter to the url.
			requestObject.url = url + (url.indexOf('?') > -1 ? '&' : '?') + token + fragment;

			// Attempt to avoid storing the url in proxies, since the access token
			// is exposed in the query parameters.
			requestObject.headers.Pragma = 'no-store';
			requestObject.headers['Cache-Control'] = 'no-store';
		}

		return requestObject;
	}

	/**
	 * Refresh a user access token with the supplied token.
	 */
	async refresh(opts?: ClientOAuth2Options): Promise<ClientOAuth2Token> {
		const options = { ...this.client.options, ...opts };

		if (!this.refreshToken) throw new Error('No refresh token');

		const requestOptions = getRequestOptions(
			{
				url: options.accessTokenUri,
				method: 'POST',
				headers: {
					...DEFAULT_HEADERS,
					Authorization: auth(options.clientId, options.clientSecret),
				},
				body: {
					refresh_token: this.refreshToken,
					grant_type: 'refresh_token',
				},
			},
			options,
		);

		const responseData = await this.client.request<ClientOAuth2TokenData>(requestOptions);
		return this.client.createToken({ ...this.data, ...responseData });
	}

	/**
	 * Check whether the token has expired.
	 */
	expired(): boolean {
		return Date.now() > this.expires.getTime();
	}
}
