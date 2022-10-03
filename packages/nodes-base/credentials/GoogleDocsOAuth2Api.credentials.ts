import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/documents',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/documents.readonly',
	],
	"n8n Sheets Only": [
		'https://www.googleapis.com/auth/drive.file',
	],
};

export class GoogleDocsOAuth2Api implements ICredentialType {
	name = 'googleDocsOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Docs OAuth2 API';
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
