import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class MailchimpOAuth2Api implements ICredentialType {
	name = 'mailchimpOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Mailchimp OAuth2 API';
	documentationUrl = 'mailchimp';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://login.mailchimp.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://login.mailchimp.com/oauth2/token',
			required: true,
		},
		{
			displayName: 'Metadata',
			name: 'metadataUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://login.mailchimp.com/oauth2/metadata',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
