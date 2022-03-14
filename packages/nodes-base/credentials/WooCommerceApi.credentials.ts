import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WooCommerceApi implements ICredentialType {
	name = 'wooCommerceApi';
	displayName = 'WooCommerce API';
	documentationUrl = 'wooCommerce';
	properties: INodeProperties[] = [
		{
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string',
			default: '',
		},
		{
			displayName: 'WooCommerce URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
		{
			displayName: 'Include Credentials in Query',
			name: 'includeCredentialsInQuery',
			type: 'boolean',
			default: false,
			description: `Occasionally, some servers may not parse the Authorization header correctly (if you see a “Consumer key is missing” error when authenticating over SSL, you have a server issue). In this case, you may provide the consumer key/secret as query string parameters instead.`,
		},
	];
}
