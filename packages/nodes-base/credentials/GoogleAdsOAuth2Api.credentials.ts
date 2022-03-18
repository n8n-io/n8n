import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/adwords',
];

export class GoogleAdsOAuth2Api implements ICredentialType {
	name = 'googleAdsOAuth2Api';
	extends = [
		'googleOAuth2Api',
	];
	displayName = 'Google Ads OAuth2 API';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName: 'Developer Token',
			name: 'devToken',
			required: true,
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your Google Ads developer token',
		},
		{
			displayName: 'Login Customer ID',
			name: 'loginCustomerId',
			type: 'string',
			default: '',
			description: 'For Google Ads API calls made by a manager to a client account (that is, when logging in as a manager to make API calls to one of its client accounts). This value represents the Google Ads customer ID of the manager making the API call. Including this header is equivalent to choosing an account in the Google Ads UI after signing in or clicking on your profile image at the top-right corner of the page. Be sure to remove any hyphens (—), for example: 1234567890, not 123-456-7890.',
		},
		{
			displayName: 'Linked Customer ID',
			name: 'linkedCustomerId',
			type: 'string',
			default: '',
			description: 'This header is only used by third-party app analytics providers when uploading conversions to a linked Google Ads account. Be sure to remove any hyphens (—), for example: 1234567890, not 123-456-7890.',
		},
	];
}
