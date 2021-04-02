import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TaigaCloudApi implements ICredentialType {
	name = 'taigaCloudApi';
	displayName = 'Taiga Cloud API';
	documentationUrl = 'taiga';
	properties = [
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
