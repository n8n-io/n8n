import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class GllueApi implements ICredentialType {
	name = 'gllueApi';
	displayName = 'Gllue API';
	documentationUrl = 'support@gllue.com';
	properties = [
		{
			displayName: 'API Host',
			name: 'apiHost',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Username',
			name: 'apiUsername',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API AES Key',
			name: 'apiAesKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
