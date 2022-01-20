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
			hint: 'Temporary credential test <b> bold me me </b> yo <a href="https://n8n.io">click me</a>',
		},
	];
}
