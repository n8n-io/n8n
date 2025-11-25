import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TtapiSora2Api implements ICredentialType {
	name = 'ttapiSora2Api';

	displayName = 'ttapi.io Sora2 API';

	documentationUrl = 'https://ttapi.io/docs/apiReference/sora';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your ttapi.io API key (TT-API-KEY)',
		},
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'string',
			default: 'https://api.ttapi.io',
			description: 'The API endpoint for ttapi.io',
		},
	];
}
