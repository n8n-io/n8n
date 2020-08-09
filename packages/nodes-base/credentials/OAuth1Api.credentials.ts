import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class OAuth1Api implements ICredentialType {
	name = 'oAuth1Api';
	displayName = 'OAuth1 API';
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
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Request Token URL',
			name: 'requestTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Signature Method',
			name: 'signatureMethod',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'HMAC-SHA1',
					value: 'HMAC-SHA1'
				},
				{
					name: 'HMAC-SHA256',
					value: 'HMAC-SHA256'
				},
			],
			default: '',
			required: true,
		},
	];
}
