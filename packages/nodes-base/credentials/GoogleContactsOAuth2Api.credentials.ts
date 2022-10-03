import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/contacts',
		'https://www.googleapis.com/auth/directory.readonly',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/contacts.readonly',
		'https://www.googleapis.com/auth/directory.readonly',
	],
};
export class GoogleContactsOAuth2Api implements ICredentialType {
	name = 'googleContactsOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Contacts OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: Object.entries(scopes).map(x => ({name: x[0], value: x[1].join(' ')})),
			default: 'Read & Write',
		},
	];
}
