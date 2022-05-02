import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SpontitApi implements ICredentialType {
	name = 'spontitApi';
	displayName = 'Spontit API';
	documentationUrl = 'spontit';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
	];
}
