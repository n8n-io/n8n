import type { Headers } from './types';

export const DEFAULT_URL_BASE = 'https://example.org/';

/**
 * Default headers for executing OAuth 2.0 flows.
 */
export const DEFAULT_HEADERS: Headers = {
	Accept: 'application/json, application/x-www-form-urlencoded',
	'Content-Type': 'application/x-www-form-urlencoded',
};

/**
 * Format error response types to regular strings for displaying to clients.
 *
 * Reference: http://tools.ietf.org/html/rfc6749#section-4.1.2.1
 */
export const ERROR_RESPONSES: Record<string, string> = {
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
