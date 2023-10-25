import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OAuth1Api implements ICredentialType {
	name = 'oAuth1Api';

	displayName = 'OAuth1 API';

	documentationUrl = 'httpRequest';

	genericAuth = true;

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
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Request Token URL',
			name: 'requestTokenUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Signature Method',
			name: 'signatureMethod',
			type: 'options',
			options: [
				{
					name: 'HMAC-SHA1',
					value: 'HMAC-SHA1',
				},
				{
					name: 'HMAC-SHA256',
					value: 'HMAC-SHA256',
				},
				{
					name: 'HMAC-SHA512',
					value: 'HMAC-SHA512',
				},
			],
			default: 'HMAC-SHA1',
			required: true,
		},
	];
}
