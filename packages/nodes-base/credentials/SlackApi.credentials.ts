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
		},
		{
			displayName: 'Signature Secret',
			name: 'signatureSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'The signing secret of your Slack app. Find it under "Basic Information" in the Slack API dashboard. n8n uses it to verify that incoming requests come from Slack. <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#verify-the-webhook" target="_blank">More info</a>.',
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
