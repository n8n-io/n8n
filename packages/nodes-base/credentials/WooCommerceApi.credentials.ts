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
	];
}
