import { httpStatusFromError } from '@n8n/backend-network';
import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';

const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';

interface TokenResponse {
	access_token?: string;
	token_type?: string;
	expires_in?: number;
}

function hasAccessToken(response: unknown): response is TokenResponse & { access_token: string } {
	return (
		typeof response === 'object' &&
		response !== null &&
		typeof (response as { access_token?: unknown }).access_token === 'string' &&
		(response as { access_token: string }).access_token.length > 0
	);
}

/**
 * Exchanges the service account's OAuth 2.0 credential for an access token via the
 * `client_credentials` grant and returns the raw `access_token`.
 *
 * Exported for unit testing. Validation runs before any network call.
 */
export async function getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
	const stringOrEmpty = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
	const clientId = stringOrEmpty(credentials.clientId);
	const clientSecret = stringOrEmpty(credentials.clientSecret);

	// Defense beyond the `required: true` UI gate — a programmatically-set credential
	// could omit these and send a malformed token request.
	if (!clientId || !clientSecret) {
		throw new OperationalError('Atlassian service account credentials are incomplete');
	}

	// No `scope` parameter, ever: Atlassian rejects any value with `invalid_scope`.
	// The credential's scopes are fixed when the admin creates it in Atlassian
	// administration and cannot be changed afterwards.
	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: clientId,
		client_secret: clientSecret,
	});

	// The token URL is a fixed Atlassian host, so the origin is not user-controlled —
	// `fixed-vendor` keeps the SSRF guard off.
	const http = getTokenRequestClient('fixed-vendor');

	let response: unknown;
	try {
		response = await http.request({
			url: TOKEN_URL,
			method: 'POST',
			body: body.toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
		});
	} catch (error) {
		// Static message only — never interpolate or log the response body or credentials.
		const status = httpStatusFromError(error);
		if (status === 401 || status === 403) {
			throw new OperationalError(
				'Atlassian rejected the service account credentials — check the Client ID and Client Secret',
			);
		}
		throw error;
	}

	if (!hasAccessToken(response)) {
		throw new OperationalError('Atlassian authentication did not return an access token');
	}

	return response.access_token;
}

export class AtlassianServiceAccountApi implements ICredentialType {
	name = 'atlassianServiceAccountApi';

	displayName = 'Atlassian Service Account';

	documentationUrl = 'atlassianserviceaccount';

	icon: Icon = 'file:icons/Atlassian.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName:
				"The service account's scopes are chosen when its OAuth 2.0 credential is created in Atlassian administration and can't be changed afterwards. Product permissions still apply on top — grant the service account access to projects and spaces like any other user.",
			name: 'setupNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description:
				"The Client ID of the service account's OAuth 2.0 credential from Atlassian administration",
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description:
				"The Client Secret of the service account's OAuth 2.0 credential from Atlassian administration",
		},
		{
			displayName: 'Site URL',
			name: 'domain',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://your-site.atlassian.net',
			description:
				'The URL of your Atlassian site, e.g. https://your-site.atlassian.net. The scheme and any path (like /wiki) are ignored.',
		},
	];

	// Only called when "accessToken" (the expirable property) is empty, on an auth-failure
	// retry, or during a credential test. Core drives expiry refresh through its retry path,
	// so we deliberately do not persist `expires_in` or run a credential-side TTL.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const accessToken = await getAccessToken(credentials);
		return { accessToken };
	}

	// Pure mapper: attach the cached bearer token only. The per-site base URL is resolved
	// by the consuming node (cloudId discovery), so no baseURL is set here.
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.accessToken as string}`,
		};

		return requestOptions;
	}

	// Lists the sites the token can reach — valid for any service account regardless of
	// granted scopes, and the same endpoint the nodes use for cloudId discovery.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.atlassian.com',
			url: '/oauth/token/accessible-resources',
			method: 'GET',
		},
	};
}
