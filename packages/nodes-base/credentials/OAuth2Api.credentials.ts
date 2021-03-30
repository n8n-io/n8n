import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class OAuth2Api implements ICredentialType {
	name = 'oAuth2Api';
	displayName = 'OAuth2 API';
	documentationUrl = 'httpRequest';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'For some services additional query parameters have to be set which can be defined here.',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options' as NodePropertyTypes,
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
	];
}
