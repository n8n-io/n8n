import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes: { [key: string]: string[] } = {
	"Read & Write": [
		'https://www.googleapis.com/auth/tasks',
	],
	"Read Only": [
		'https://www.googleapis.com/auth/tasks.readonly',
	],
};
export class GoogleTasksOAuth2Api implements ICredentialType {
	name = 'googleTasksOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Tasks OAuth2 API';
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
