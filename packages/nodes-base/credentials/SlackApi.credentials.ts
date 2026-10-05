import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
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
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'In your Slack app, open OAuth & Permissions. Copy the Bot User OAuth Token (xoxb-) or User OAuth Token (xoxp-), depending on the operations you need.',
		},
		{
			displayName: 'Signature Secret',
			name: 'signatureSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'The signature secret is used to verify the authenticity of requests sent by Slack.',
		},
		{
			displayName: 'Managed App ID',
			name: 'managedAppId',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Slack Team ID',
			name: 'teamId',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Manager Credential ID',
			name: 'managerCredentialId',
			type: 'hidden',
			default: '',
		},
<<<<<<< HEAD
=======
		{
			// Set when n8n builds the Slack app for an Agent: the app sends its events to that Agent only
			displayName: 'Agent ID',
			name: 'agentId',
			type: 'hidden',
			default: '',
		},
		{
			displayName:
				'We strongly recommend setting up a <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">signing secret</a> to ensure the authenticity of requests.',
			name: 'notice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					signatureSecret: [''],
				},
			},
		},
>>>>>>> 388b4036d4e351363bfa5c3db0274a02721999f3
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://slack.com',
			url: '/api/users.profile.get',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'error',
					value: 'invalid_auth',
					message: 'Invalid access token',
				},
			},
		],
	};
}
