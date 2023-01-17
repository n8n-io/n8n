import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MarketstackApi implements ICredentialType {
	name = 'marketstackApi';

	displayName = 'Marketstack API';

	documentationUrl = 'marketstack';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Use HTTPS',
			name: 'useHttps',
			type: 'boolean',
			default: false,
			description: 'Whether to use HTTPS (paid plans only)',
		},
	];
}
