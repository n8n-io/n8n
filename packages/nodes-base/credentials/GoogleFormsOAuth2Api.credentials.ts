import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	"https://www.googleapis.com/auth/forms.body.readonly",
	"https://www.googleapis.com/auth/drive.file",
	"https://www.googleapis.com/auth/drive",
];

export class GoogleFormsOAuth2Api implements ICredentialType {
	name = 'googleFormsOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Forms OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
