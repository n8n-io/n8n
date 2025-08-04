import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ServiceNowOAuth2Api implements ICredentialType {
	name = 'serviceNowOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'ServiceNow OAuth2 API';

	documentationUrl = 'serviceNow';

	properties: INodeProperties[] = [
		{
			displayName: 'Use custom host?',
			name: 'useCustomHost',
			type: 'boolean',
			default: false,
			description:
				'Enable if your ServiceNow instance is hosted on a custom domain or behind a reverse-proxy',
		},
		{
			displayName: 'Custom Host',
			name: 'customHost',
			type: 'string',
			placeholder: 'https://sn.my-company.internal',
			description: 'Full base-URL of the instance',
			default: '',
			displayOptions: {
				show: {
					useCustomHost: [true],
				},
			},
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			hint: 'The subdomain can be extracted from the URL. If the URL is: https://dev99890.service-now.com the subdomain is dev99890',
			default: '',
			required: true,
			displayOptions: {
				show: {
					useCustomHost: [false],
				},
			},
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			required: true,
			default:
				'= {{$self.useCustomHost ? ' +
				'$self.customHost.replace(/\\/$/, "") : ' +
				'"https://" + $self.subdomain + ".service-now.com"}}/oauth_auth.do',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			required: true,
			default:
				'= {{$self.useCustomHost ? ' +
				'$self.customHost.replace(/\\/$/, "") : ' +
				'"https://" + $self.subdomain + ".service-now.com"}}/oauth_token.do',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'useraccount',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'response_type=code',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'grant_type=authorization_code',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
