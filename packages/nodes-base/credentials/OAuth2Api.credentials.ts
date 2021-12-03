import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class OAuth2Api implements ICredentialType {
	name = 'oAuth2Api';
	displayName = 'OAuth2 API';
	documentationUrl = 'httpRequest';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string',
			default: '',
			description: 'For some services additional query parameters have to be set which can be defined here.',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
			description: 'Resource to consume.',
		},
		{
			displayName: 'Delegated or Application permission',
			name: 'permissionType',
			type: 'options',
			options: [
				{
					name: 'Delegated',
					value: 'delegated',
					description: 'Delegated permissions are used by apps that have a signed-in user present. For these apps, either the user or an administrator consents to the permissions that the app requests. The app is delegated with the permission to act as a signed-in user when it makes calls to the target resource.'
				},
				{
					name: 'Application',
					value: 'application',
					description: 'Application permissions are used by apps that run without a signed-in user present, for example, apps that run as background services or daemons. Only an administrator can consent to application permissions.'
				}
			],
			default: 'delegated',
			description: 'Use delegated or application permission'
		}
	];
}
