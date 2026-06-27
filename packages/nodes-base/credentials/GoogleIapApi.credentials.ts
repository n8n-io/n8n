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

	httpRequestNode = {
		name: 'Google IAP',
		docsUrl: 'https://cloud.google.com/iap/docs/authentication-howto',
		apiBaseUrlPlaceholder: 'https://your-iap-protected-app.example.com/',
	};

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
			description: 'Enter the private key',
			required: true,
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Private Key ID',
			name: 'privateKeyId',
			type: 'string',
			default: '',
			placeholder: 'key-id-from-json-file',
			description: 'The private_key_id',
			required: false,
		},
		{
			displayName: 'IAP Client ID',
			name: 'iapClientId',
			type: 'string',
			default: '',
			placeholder: 'xxxxx.apps.googleusercontent.com',
			description: 'The OAuth 2.0 Client ID from your IAP-protected application.',
			required: true,
		},
		{
			displayName: 'Impersonate User (Domain-Wide Delegation)',
			name: 'impersonate',
			type: 'boolean',
			default: false,
			description:
				'Enable to impersonate a user via domain-wide delegation. This only works if domain-wide delegation is configured for your service account.',
		},
		{
			displayName: 'Delegated User Email',
			name: 'delegatedEmail',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					impersonate: [true],
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
		const privateKeyId = credentials.privateKeyId
			? (credentials.privateKeyId as string).trim()
			: undefined;

		const impersonate = Boolean(credentials.impersonate);
		const delegatedEmailRaw = (credentials.delegatedEmail as string | undefined)?.trim();
		const subject = impersonate && delegatedEmailRaw ? delegatedEmailRaw : email;

		const now = moment().unix();

		// Create JWT assertion for IAP token exchange
		const signOptions: jwt.SignOptions = {
			algorithm: 'RS256',
		};

		if (privateKeyId) {
			signOptions.keyid = privateKeyId;
		}

		const assertion = jwt.sign(
			{
				iss: email,
				sub: subject,
				aud: 'https://oauth2.googleapis.com/token',
				iat: now - 10, // Clock skew handling: set iat 10 seconds in the past
				exp: now + 3600,
				target_audience: iapClientId,
			},
			privateKey,
			signOptions,
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
			}),
			url: 'https://oauth2.googleapis.com/token',
		};

		let result;
		try {
			result = await axios(axiosRequestConfig);
		} catch (err: unknown) {
			const axiosError = err as {
				response?: { status?: number; data?: { error_description?: string; error?: string } };
				message?: string;
			};
			const status = axiosError?.response?.status;
			const data = axiosError?.response?.data;
			throw new Error(
				`Google IAP token exchange failed${status ? ` (HTTP ${status})` : ''}: ` +
					`${data?.error_description ?? data?.error ?? axiosError?.message ?? 'Unknown error'}`,
			);
		}

		// Validate id_token response
		const idToken = result?.data?.id_token;
		if (typeof idToken !== 'string' || idToken.length === 0) {
			throw new Error(
				`Google IAP token exchange response missing id_token. Got: ${JSON.stringify(result?.data)}`,
			);
		}

		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				Authorization: `Bearer ${idToken}`,
			},
		};
	}
}
