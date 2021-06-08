import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class DeepLApi implements ICredentialType {
	name = 'deepLApi';
	displayName = 'DeepL API';
	documentationUrl = 'deepL';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Plan',
			name: 'apiPlan',
			type: 'options' as NodePropertyTypes,
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
