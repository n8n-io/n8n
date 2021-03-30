import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class SlackApi implements ICredentialType {
	name = 'slackApi';
	displayName = 'Slack API';
	documentationUrl = 'slack';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
