import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MetabaseApi implements ICredentialType {
	name = 'metabaseApi';
	displayName = 'Metabase API';
	documentationUrl = 'metabase';
	extends = [
		'renovateMetabaseToken',
	];
	properties: INodeProperties[] = [
		{
			displayName: 'Api url',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	// ! Special authentication is needed, as the Metabase API is using a special auth
	// ! 1st solution would be to authenticate at every request, but this is bad for performance
	// ! 2nd solution is to use a implement a special auth function just for Metabase
}
