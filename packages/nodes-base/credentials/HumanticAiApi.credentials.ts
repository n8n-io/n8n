import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HumanticAiApi implements ICredentialType {
	name = 'humanticAiApi';
	displayName = 'Humantic AI API';
	documentationUrl = 'humanticAi';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
