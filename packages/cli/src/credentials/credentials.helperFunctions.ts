import querystring from 'querystring';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import type { IDataObject } from 'n8n-workflow';
export interface OAuth2Parameters {
	clientId?: string;
	clientSecret?: string;
	accessTokenUri?: string;
	authorizationUri?: string;
	redirectUri?: string;
	scopes?: string[];
	state?: string;
	body?: {
		[key: string]: string | string[];
	};
	query?: {
		[key: string]: string | string[];
	};
	headers?: {
		[key: string]: string | string[];
	};
}

export function auth(username: string, password: string) {
	return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

const ERROR_RESPONSES: IDataObject = {
	invalid_request: [
		'The request is missing a required parameter, includes an',
		'invalid parameter value, includes a parameter more than',
		'once, or is otherwise malformed.',
	].join(' '),
	invalid_client: [
		'Client authentication failed (e.g., unknown client, no',
		'client authentication included, or unsupported',
		'authentication method).',
	].join(' '),
	invalid_grant: [
		'The provided authorization grant (e.g., authorization',
		'code, resource owner credentials) or refresh token is',
		'invalid, expired, revoked, does not match the redirection',
		'URI used in the authorization request, or was issued to',
		'another client.',
	].join(' '),
	unauthorized_client: [
		'The client is not authorized to request an authorization',
		'code using this method.',
	].join(' '),
	unsupported_grant_type: [
		'The authorization grant type is not supported by the',
		'authorization server.',
	].join(' '),
	access_denied: ['The resource owner or authorization server denied the request.'].join(' '),
	unsupported_response_type: [
		'The authorization server does not support obtaining',
		'an authorization code using this method.',
	].join(' '),
	invalid_scope: ['The requested scope is invalid, unknown, or malformed.'].join(' '),
	server_error: [
		'The authorization server encountered an unexpected',
		'condition that prevented it from fulfilling the request.',
		'(This error code is needed because a 500 Internal Server',
		'Error HTTP status code cannot be returned to the client',
		'via an HTTP redirect.)',
	].join(' '),
	temporarily_unavailable: [
		'The authorization server is currently unable to handle',
		'the request due to a temporary overloading or maintenance',
		'of the server.',
	].join(' '),
};

const DEFAULT_HEADERS = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Accept: 'application/json, application/x-www-form-urlencoded',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'Content-type': 'application/x-www-form-urlencoded',
};

export interface ClientOAuth2Token {
	data: IDataObject;
	accessToken?: string;
	refreshToken?: string;
	tokenType?: string;
	expiresIn?: number;
}

export function createToken(data: IDataObject) {
	const token: ClientOAuth2Token = {
		data,
	};
	return token;
}

export function mergeRequestOptions(requestOptions: IDataObject, options: OAuth2Parameters) {
	return {
		url: requestOptions.url,
		method: requestOptions.method,
		headers: Object.assign({}, requestOptions.headers, options.headers),
		body: Object.assign({}, requestOptions.body, options.body),
		query: Object.assign({}, requestOptions.query, options.query),
	};
}

export function getAuthError(body: IDataObject) {
	const message = (ERROR_RESPONSES[body.error as string] ??
		body.error_description ??
		body.error) as string;
	if (message) {
		const error = new Error(message);
		// err.body = body;
		// err.code = body.error;
		return error;
	} else {
		return null;
	}
}

export function getUri(options: OAuth2Parameters, tokenType: string) {
	if (!options.clientId || !options.authorizationUri) {
		return Error('Options incomplete, expecting clientId and authorizationUri');
	}
	const qs = {
		client_id: options.clientId,
		redirect_uri: options.redirectUri,
		response_type: tokenType,
		state: options.state,
	};

	if (options.scopes !== undefined) {
		Object.assign(qs, { scope: options.scopes.join(' ') });
	}

	const sep = options.authorizationUri.includes('?') ? '&' : '?';
	return options.authorizationUri + sep + querystring.stringify(Object.assign(qs, options.query));
}

export async function request(options: IDataObject) {
	let url = options.url as string;
	const body = new URLSearchParams(options.body as string).toString();
	const query = new URLSearchParams(options.query as string).toString();

	if (query) {
		url += (url.indexOf('?') === -1 ? '?' : '&') + query;
	}

	return axios
		.post(url, body, {
			headers: options.headers,
		})
		.then((response: AxiosResponse) => {
			const data = response.data as IDataObject;
			if (getAuthError(data)) {
				return Promise.reject(getAuthError(data));
			}
			if (response.status < 200 || response.status >= 300) {
				return Promise.reject(new Error(`Request failed with status code ${response.status}`));
			}

			return data;
		});
}

export async function getToken(
	uri: string,
	incOptions: object,
	oAuth2Parameters: OAuth2Parameters,
) {
	const options = Object.assign({}, oAuth2Parameters, incOptions);

	const url = new URL(uri);

	if (
		typeof options.redirectUri === 'string' &&
		typeof url.pathname === 'string' &&
		url.pathname !== new URL(options.redirectUri).pathname
	) {
		return Promise.reject(
			new TypeError('Redirected path should match configured path, but got: ' + url.pathname),
		);
	}

	if (!url.search?.substr(1)) {
		return Promise.reject(new TypeError('Unable to process uri: ' + uri));
	}

	const data =
		typeof url.search === 'string' ? querystring.parse(url.search.substr(1)) : url.search || {};
	const error = getAuthError(data);

	if (error) {
		return Promise.reject(error);
	}

	if (options.state !== null && data.state !== options.state) {
		return Promise.reject(new TypeError(`Invalid state: ${data.state as string}`));
	}

	// Check whether the response code is set.
	if (!data.code) {
		return Promise.reject(new TypeError('Missing code, unable to request token'));
	}

	const headers = Object.assign({}, DEFAULT_HEADERS);
	const body = {
		code: data.code,
		grant_type: 'authorization_code',
		redirect_uri: options.redirectUri,
	};

	// `client_id`: REQUIRED, if the client is not authenticating with the
	// authorization server as described in Section 3.2.1.
	// Reference: https://tools.ietf.org/html/rfc6749#section-3.2.1
	if (options.clientSecret && options.clientId) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Object.assign(headers, { Authorization: auth(options.clientId, options.clientSecret) });
	} else {
		Object.assign(body, { client_id: options.clientId });
	}

	return request(
		mergeRequestOptions(
			{
				url: options.accessTokenUri,
				method: 'POST',
				headers,
				body,
			},
			options,
		),
	).then(function (returnedData: IDataObject) {
		return createToken(returnedData);
	});
}
