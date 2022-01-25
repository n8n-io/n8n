import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class SlackApi implements ICredentialType {
	name = 'slackApi';
	displayName = 'Slack API';
	documentationUrl = 'slack';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
