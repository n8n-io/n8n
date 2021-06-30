import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DiscourseApi implements ICredentialType {
	name = 'discourseApi';
	displayName = 'Discourse API';
	documentationUrl = 'discourse';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
			type: 'string',
			default: '',
		},
	];
}
