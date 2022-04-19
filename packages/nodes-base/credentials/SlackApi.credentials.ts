import {
	IAuthenticateBearer,
	IAuthenticateQueryAuth,
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
			default: '',
			required: true,
		},
	];
	authenticate: IAuthenticateBearer = {
		type: 'bearer',
		properties: {
			tokenPropertyName: 'accessToken',
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
					key: 'ok',
					value: false,
					message: 'Invalid access token',
				},
			},
		],
	};
}
