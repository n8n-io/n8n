import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class TaigaApi implements ICredentialType {
	name = 'taigaApi';
	displayName = 'Taiga API';
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
