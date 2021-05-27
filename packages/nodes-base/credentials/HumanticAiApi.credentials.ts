import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HumanticAiApi implements ICredentialType {
	name = 'humanticAiApi';
	displayName = 'Humantic AI API';
	documentationUrl = 'humanticAi';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
