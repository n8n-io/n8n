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

export class GoogleIapApi implements ICredentialType {
	name = 'googleIapApi';

	displayName = 'Google IAP (Identity-Aware Proxy) API';

	documentationUrl = 'google/service-account';

	icon: Icon = 'file:icons/Google.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Service Account Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@project.iam.gserviceaccount.com',
			default: '',
			description: 'The Google Service account email',
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
			displayName: 'IAP Client ID',
			name: 'iapClientId',
			type: 'string',
			default: '',
			placeholder: 'xxxxx.apps.googleusercontent.com',
			description:
				'The OAuth 2.0 Client ID from your IAP-protected application. Find this in GCP Console > Security > Identity-Aware Proxy.',
			required: true,
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
		const email = (credentials.email as string).trim();
		const iapClientId = (credentials.iapClientId as string).trim();

		const now = moment().unix();

		// Create JWT assertion for IAP token exchange
		// The key difference from standard OAuth is the target_audience claim
		const assertion = jwt.sign(
			{
				iss: email,
				sub: credentials.delegatedEmail || email,
				aud: 'https://oauth2.googleapis.com/token',
				iat: now,
				exp: now + 3600,
				target_audience: iapClientId,
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

		// Exchange JWT for IAP ID token
		const axiosRequestConfig: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			data: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion,
			}).toString(),
			url: 'https://oauth2.googleapis.com/token',
		};

		const result = await axios(axiosRequestConfig);

		// IAP returns id_token instead of access_token
		const { id_token } = result.data;

		const requestOptionsWithAuth: IHttpRequestOptions = {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${id_token}`,
			},
		};

		return requestOptionsWithAuth;
	}
}
