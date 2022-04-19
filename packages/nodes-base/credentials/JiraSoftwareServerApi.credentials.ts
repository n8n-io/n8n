import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JiraSoftwareServerApi implements ICredentialType {
	name = 'jiraSoftwareServerApi';
	displayName = 'Jira SW Server API';
	documentationUrl = 'jira';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			typeOptions: {
				password: true,
			},
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
}
