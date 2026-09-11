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
			// Hidden, not removed: Slack Trigger nodes created before the Slack Signing Secret
			// credential existed keep verifying requests with the value that is already stored.
			// `password` keeps the API redacting the stored value; redaction ignores `type`.
			displayName: 'Signature Secret',
			name: 'signatureSecret',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
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
