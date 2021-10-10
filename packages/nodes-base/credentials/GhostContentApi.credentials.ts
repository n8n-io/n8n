import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GhostContentApi implements ICredentialType {
	name = 'ghostContentApi';
	displayName = 'Ghost Content API';
	documentationUrl = 'ghost';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'http://localhost:3001',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
