import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class QuickBaseApi implements ICredentialType {
	name = 'quickbaseApi';
	displayName = 'Quick Base API';
	documentationUrl = 'quickbase';
	properties = [
		{
			displayName: 'Hostname',
			name: 'hostname',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'demo.quickbase.com',
		}, 
		{
			displayName: 'User Token',
			name: 'userToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
