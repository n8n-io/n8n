import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class JiraSoftwareServerApi implements ICredentialType {
	name = 'jiraSoftwareServerApi';
	displayName = 'Jira SW Server API';
	properties = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
