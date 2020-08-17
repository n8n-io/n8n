import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BitbucketApi implements ICredentialType {
	name = 'bitbucketApi';
	displayName = 'Bitbucket API';
	documentationUrl = 'bitbucket';
	properties = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'App Password',
			name: 'appPassword',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
