import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class LinearApi implements ICredentialType {
	name = 'linearApi';
	displayName = 'Linear API';
	documentationUrl = 'linear';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
