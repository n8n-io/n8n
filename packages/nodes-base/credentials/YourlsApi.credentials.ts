import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class YourlsApi implements ICredentialType {
	name = 'yourlsApi';
	displayName = 'Yourls API';
	documentationUrl = 'yourls';
	properties: INodeProperties[] = [
		{
			displayName: 'Signature',
			name: 'signature',
			type: 'string',
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'http://localhost:8080',
		},
	];
}
