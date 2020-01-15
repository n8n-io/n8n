import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MauticApi implements ICredentialType {
	name = 'mauticApi';
	displayName = 'Mautic API';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
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
