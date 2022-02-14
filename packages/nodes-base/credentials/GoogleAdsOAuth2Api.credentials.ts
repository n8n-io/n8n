import {
	IAuthenticateHeaderAuth,
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
	displayName = 'Google Ads OAuth2 API';
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

	// authenticate = {
	// 	type: 'headerAuth',
	// 	properties: {
	// 		name: 'Authorization',
	// 		value: '=Bearer {{$credentials.oauthTokenData.access_token}}',
	// 	},
	// } as IAuthenticateHeaderAuth;

	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		// @ts-ignore
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.oauthTokenData!.access_token}`;
		requestOptions.headers!['Content-Type'] = `application/x-www-form-urlencoded`;
		requestOptions.headers!['developer-token'] = credentials.developerToken;
		return requestOptions;
	}

}
