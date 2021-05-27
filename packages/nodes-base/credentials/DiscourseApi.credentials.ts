import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DiscourseApi implements ICredentialType {
	name = 'discourseApi';
	displayName = 'Discourse API';
	documentationUrl = 'discourse';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}