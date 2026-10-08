import type { INodeCredentialDescription, INodeProperties } from 'n8n-workflow';

export const databricksCredentials: INodeCredentialDescription[] = [
	{
		name: 'databricksApi',
		required: true,
		displayOptions: {
			show: {
				authentication: ['accessToken'],
			},
		},
	},
	{
		name: 'databricksOAuth2Api',
		required: true,
		displayOptions: {
			show: {
				authentication: ['oAuth2'],
			},
		},
	},
];

export const authenticationProperty: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	options: [
		{
			name: 'Access Token',
			value: 'accessToken',
		},
		{
			name: 'OAuth2',
			value: 'oAuth2',
		},
	],
	default: 'accessToken',
};
