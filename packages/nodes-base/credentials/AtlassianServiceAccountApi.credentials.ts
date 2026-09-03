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
import { OperationalError, UserError } from 'n8n-workflow';

import {
	getTokenRequestClient,
	hasAccessToken,
	TOKEN_REQUEST_TIMEOUT,
} from './common/token-request';

const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';

export async function getAccessToken(credentials: ICredentialDataDecryptedObject): Promise<string> {
	const stringOrEmpty = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
	const clientId = stringOrEmpty(credentials.clientId);
	const clientSecret = stringOrEmpty(credentials.clientSecret);

	if (!clientId || !clientSecret) {
		throw new UserError('Atlassian service account credentials are incomplete');
	}

	// Atlassian rejects any `scope` value with invalid_scope
	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: clientId,
		client_secret: clientSecret,
	});

	let response: unknown;
	try {
		response = await getTokenRequestClient('fixed-vendor').request({
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
		// 400 is invalid_client for an unknown client; the message stays static so no response data leaks
		const status = httpStatusFromError(error);
		if (status === 400 || status === 401 || status === 403) {
			throw new UserError(
				'Atlassian rejected the service account credentials. Check the Client ID and Client Secret.',
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
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const accessToken = await getAccessToken(credentials);
		return { accessToken };
	}

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

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.atlassian.com',
			url: '/oauth/token/accessible-resources',
			method: 'GET',
		},
	};
}
