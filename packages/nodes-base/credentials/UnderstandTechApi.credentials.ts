import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class UnderstandTechApi implements ICredentialType {
	name = 'understandTechApi';
	displayName = 'Understand Tech API';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
