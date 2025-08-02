import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class MailerLiteApi implements ICredentialType {
	name = 'mailerLiteApi';

	displayName = 'Mailer Lite API';

	documentationUrl = 'mailerLite';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Classic API',
			name: 'classicApi',
			type: 'boolean',
			default: true,
			description:
				'If the Classic API should be used, If this is your first time using this node this should be false.',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (credentials.classicApi === true) {
			requestOptions.headers = {
				'X-MailerLite-ApiKey': credentials.apiKey as string,
			};
		} else {
			requestOptions.headers = {
				Authorization: `Bearer ${credentials.apiKey as string}`,
			};
		}
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.classicApi ? "https://api.mailerlite.com/api/v2" : "https://connect.mailerlite.com/api"}}',
			url: '/groups',
		},
	};
}
