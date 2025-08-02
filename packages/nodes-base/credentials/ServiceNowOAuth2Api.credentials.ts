import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ServiceNowOAuth2Api implements ICredentialType {
	name = 'serviceNowOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'ServiceNow OAuth2 API';
	documentationUrl = 'serviceNow';

	/* ────────────────────────── Properties ────────────────────────── */
	properties: INodeProperties[] = [
		/* ----------  Instance selector  ---------- */
		{
			displayName: 'Use custom host?',
			name: 'useCustomHost',
			type: 'boolean',
			default: false,
			description:
				'Enable if your ServiceNow instance lives on a custom domain or behind a reverse-proxy',
		},
		{
			displayName: 'Custom Host',
			name: 'customHost',
			type: 'string',
			placeholder: 'https://sn.my-company.internal',
			description: 'Full base URL **without** a trailing slash',
			default: '',
			displayOptions: { show: { useCustomHost: [true] } },
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			hint: 'For https://dev99890.service-now.com the subdomain is “dev99890”',
			default: '',
			required: true,
			displayOptions: { show: { useCustomHost: [false] } },
		},

		/* ----------  OAuth2 settings  ---------- */
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
			/*
			 *  Builds:
			 *    • https://<sub>.service-now.com/oauth_auth.do      (legacy)
			 *    • https://<customHost>/oauth_auth.do               (custom)
			 *
			 *  .replace(/\/$/, '') strips **one** trailing slash in case
			 *  the user pastes `https://host/` instead of `https://host`.
			 */
			default:
				'= {{$self.useCustomHost' +
				' ? $self.customHost.replace(/\\/$/, "")' +
				' : "https://" + $self.subdomain + ".service-now.com"}}/oauth_auth.do',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			required: true,
			default:
				'= {{$self.useCustomHost' +
				' ? $self.customHost.replace(/\\/$/, "")' +
				' : "https://" + $self.subdomain + ".service-now.com"}}/oauth_token.do',
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
			displayName: 'Token URI Query Parameters',
			name: 'tokenQueryParameters',
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
