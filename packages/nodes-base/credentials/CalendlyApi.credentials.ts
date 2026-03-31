import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class CalendlyApi implements ICredentialType {
	name = 'calendlyApi';
	displayName = 'Calendly API (Personal Access Token)';
	documentationUrl = 'https://docs.n8n.io/integrations/builtin/nodes/n8n-nodes-base.calendly/';
	icon: Icon = 'file:icons/Calendly.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				"The Personal Access Token for your Calendly account. Requires 'user:read' and 'webhook:manage' scopes.",
		},
		{
			displayName: 'API Key (Deprecated)',
			name: 'apiKey',
			type: 'hidden',
			default: '',
			description:
				'Legacy API Key. This authentication method is deprecated and will be discontinued by Calendly on May 31, 2025. Please migrate to a Personal Access Token.',
		},
		{
			displayName: 'Webhook Signing Key',
			name: 'webhookSigningKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: false,
			description:
				'Optional. Enter the Signing Key from your Calendly Developer Dashboard to enable HMAC signature verification.',
		},
	];

	// eslint-disable-next-line @typescript-eslint/require-await
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const token = (credentials.accessToken as string) || (credentials.apiKey as string);

		let isV2 = false;
		try {
			const urlString = requestOptions.baseURL || requestOptions.url || '';
			if (urlString.startsWith('http')) {
				const url = new URL(urlString);
				isV2 = url.hostname === 'api.calendly.com';
			}
		} catch {
			// Fallback to legacy check if URL is malformed or relative
			isV2 =
				requestOptions.baseURL?.includes('api.calendly.com') ||
				requestOptions.url?.includes('api.calendly.com') ||
				false;
		}

		if (isV2) {
			requestOptions.headers = {
				...requestOptions.headers,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: `Bearer ${token}`,
			};
		} else {
			requestOptions.headers = {
				...requestOptions.headers,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'X-TOKEN': token,
			};
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.calendly.com',
			method: 'GET',
			url: '/users/me',
		},
	};
}
