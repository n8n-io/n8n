import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CalApi implements ICredentialType {
	name = 'calApi';
	displayName = 'Cal API';
	documentationUrl = 'cal';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
