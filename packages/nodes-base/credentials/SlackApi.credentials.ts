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
			description:
				'The signature secret is used to verify the authenticity of requests sent by Slack.',
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
