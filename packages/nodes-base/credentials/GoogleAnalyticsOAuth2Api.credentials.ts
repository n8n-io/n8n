import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/analytics',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/analytics.readonly',
	],
};
export class GoogleAnalyticsOAuth2Api implements ICredentialType {
	name = 'googleAnalyticsOAuth2';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Analytics OAuth2 API';
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
