import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WhatsAppTriggerApi implements ICredentialType {
	name = 'whatsAppTriggerApi';

	displayName = 'WhatsApp OAuth API';

	documentationUrl = 'whatsApp';

	properties: INodeProperties[] = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
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
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: 'https://graph.facebook.com/v19.0/oauth/access_token',
			body: {
				client_id: '={{$credentials.clientId}}',
				client_secret: '={{$credentials.clientSecret}}',
				grant_type: 'client_credentials',
			},
		},
	};
}
