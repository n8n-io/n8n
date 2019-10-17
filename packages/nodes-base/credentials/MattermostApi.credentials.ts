import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class MattermostApi implements ICredentialType {
	name = 'MattermostApi';
	displayName = 'Mattermost API';
	properties = [
		{
			displayName: 'Webhook URI',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
