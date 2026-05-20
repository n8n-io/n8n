import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/devstorage.full_control',
	'https://www.googleapis.com/auth/cloud-platform',
];

export class GoogleCloudStorageApi implements ICredentialType {
	name = 'googleCloudStorageApi';

	displayName = 'Google Cloud Storage Service Account API';

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
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();
		credentials.email = (credentials.email as string).trim();

		const now = moment().unix();

		const signature = jwt.sign(
			{
				iss: credentials.email,
				sub: credentials.delegatedEmail || credentials.email,
				scope: scopes.join(' '),
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
