import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WuyinkeSora2Api implements ICredentialType {
	name = 'wuyinkeSora2Api';

	displayName = 'Wuyinke Sora2 API';

	documentationUrl = 'https://api.wuyinkeji.com/doc/35';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your Wuyinke API key',
		},
		{
			displayName: 'API Endpoint',
			name: 'apiEndpoint',
			type: 'string',
			default: 'https://api.wuyinkeji.com',
			description: 'The API endpoint for Wuyinke',
		},
	];
}
