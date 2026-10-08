import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

import { googleServiceAccountProperties } from './common/google/descriptions';
import { getTokenRequestClient, TOKEN_REQUEST_TIMEOUT } from './common/token-request';

export class GoogleApi implements ICredentialType {
	name = 'googleApi';

	displayName = 'Google Service Account API';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/Google.svg';

	properties: INodeProperties[] = [
		...googleServiceAccountProperties,
		{
			displayName: 'Impersonate a User',
			name: 'inpersonate',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Email',
			name: 'delegatedEmail',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					inpersonate: [true],
				},
			},
			description:
				'The email address of the user for which the application is requesting delegated access',
		},
		{
			displayName: 'Set up for use in HTTP Request node',
			name: 'httpNode',
			type: 'boolean',
			default: false,
		},
		{
			displayName:
				"When using the HTTP Request node, you must specify the scopes you want to send. In other nodes, they're added automatically",
			name: 'httpWarning',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					httpNode: [true],
				},
			},
		},
		{
			displayName: 'Scope(s)',
			name: 'scopes',
			type: 'string',
			default: '',
			description:
				'You can find the scopes for services <a href="https://developers.google.com/identity/protocols/oauth2/scopes" target="_blank">here</a>',
			displayOptions: {
				show: {
					httpNode: [true],
				},
			},
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (!credentials.httpNode) return requestOptions;

		const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();
		const credentialsScopes = (credentials.scopes as string).replace(/\\n/g, '\n').trim();
		credentials.email = (credentials.email as string).trim();

		const regex = /[,\s\n]+/;
		const scopes = credentialsScopes
			.split(regex)
			.filter((scope) => scope)
			.join(' ');

		const now = moment().unix();

		const signature = jwt.sign(
			{
				iss: credentials.email,
				sub: credentials.delegatedEmail || credentials.email,
				scope: scopes,
				aud: 'https://oauth2.googleapis.com/token',
				iat: now,
				exp: now + 3600,
			},
			privateKey,
			{
				algorithm: 'RS256',
				header: {
					typ: 'JWT',
					alg: 'RS256',
				},
			},
		);

		// Fixed Google vendor host, independent of any n8n config, so SSRF protection is opted out.
		const http = getTokenRequestClient('fixed-vendor');

		const { access_token } = (await http.request({
			url: 'https://oauth2.googleapis.com/token',
			method: 'POST',
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: signature,
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
		})) as { access_token: string };

		const requestOptionsWithAuth: IHttpRequestOptions = {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${access_token}`,
			},
		};

		return requestOptionsWithAuth;
	}
}
