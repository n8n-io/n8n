import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

import moment from 'moment-timezone';

import jwt from 'jsonwebtoken';

import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

export class GoogleApi implements ICredentialType {
	name = 'googleApi';

	displayName = 'Google Service Account API';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/Google.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Service Account Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
			description: 'The Google Service account similar to user-808@project.iam.gserviceaccount.com',
			required: true,
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			default: '',
			placeholder:
				'-----BEGIN PRIVATE KEY-----\nXIYEvQIBADANBg<...>0IhA7TMoGYPQc=\n-----END PRIVATE KEY-----\n',
			description:
				'Enter the private key located in the JSON file downloaded from Google Cloud Console',
			required: true,
			typeOptions: {
				password: true,
			},
		},
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
					kid: privateKey,
					typ: 'JWT',
					alg: 'RS256',
				},
			},
		);

		const axiosRequestConfig: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			data: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: signature,
			}).toString(),
			url: 'https://oauth2.googleapis.com/token',
		};

		const result = await axios(axiosRequestConfig);

		const { access_token } = result.data;

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
