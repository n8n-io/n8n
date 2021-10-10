import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DeepLApi implements ICredentialType {
	name = 'deepLApi';
	displayName = 'DeepL API';
	documentationUrl = 'deepL';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Plan',
			name: 'apiPlan',
			type: 'options',
			options: [
				{
					name: 'Pro Plan',
					value: 'pro',
				},
				{
					name: 'Free Plan',
					value: 'free',
				},
			],
			default: 'pro',
		},
	];
}
