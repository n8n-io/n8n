import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WooCommerceApi implements ICredentialType {
	name = 'wooCommerceApi';
	displayName = 'WooCommerce API';
	documentationUrl = 'wooCommerce';
	properties = [
		{
			displayName: 'Consumer Key',
			name: 'consumerKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Consumer Secret',
			name: 'consumerSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'WooCommerce URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://example.com',
		},
		{
			displayName: 'Include Credentials in Query',
			name: 'includeCredentialsInQuery',
			type: 'boolean' as NodePropertyTypes,
			default: false,
			description: `Occasionally, some servers may not parse the Authorization header correctly</br>
			(if you see a “Consumer key is missing” error when authenticating over SSL, you have a server issue).</br>
			In this case, you may provide the consumer key/secret as query string parameters instead.`,
		},
	];
}
