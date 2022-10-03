import { ICredentialType, IDataObject, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/spreadsheets',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/spreadsheets.readonly',
	],
	"n8n Sheets Only": [
		'https://www.googleapis.com/auth/drive.file',
	],
};

export class GoogleSheetsOAuth2Api implements ICredentialType {
	name = 'googleSheetsOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Sheets OAuth2 API';
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
