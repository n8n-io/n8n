import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class MattermostApi implements ICredentialType {
	name = 'mattermostApi';
	displayName = 'Mattermost API';
	documentationUrl = 'mattermost';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
		},
	];
}
