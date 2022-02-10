import {
	// IAuthenticateHeaderAuth,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
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
	displayName = 'Google Ads OAuth2 API test';
	documentationUrl = 'google';
	properties: INodeProperties[] = [
		{
			displayName: 'Developer Token',
			name: 'developerToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];


	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		console.log('GoogleAds.authenticate');
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
		requestOptions.headers!['developer-token'] = `${credentials.developerToken}`;
		requestOptions.headers!['Content-Type'] = `application/x-www-form-urlencoded`;
		return requestOptions;
	}
}
