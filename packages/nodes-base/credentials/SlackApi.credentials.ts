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
				'Only needed for Agent Slack integrations. The Slack Trigger node and Send and Wait approvals use the separate "Slack Signing Secret" credential.',
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
