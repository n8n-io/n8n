import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Xentral implements ICredentialType {
	name = 'xentral';
	displayName = 'Xentral';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'Xentral URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://examplexentralserver.exampleservice.com',
		},
		{
			displayName: 'Benutzername',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Initkey / Passwort',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
