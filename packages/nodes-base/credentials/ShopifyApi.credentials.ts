import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShopifyApi implements ICredentialType {
	name = 'shopifyApi';
	displayName = 'Shopify API';
	documentationUrl = 'shopify';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Shop Subdomain',
			name: 'shopSubdomain',
			required: true,
			type: 'string',
			default: '',
			description: 'Only the subdomain without .myshopify.com',
		},
		{
			displayName: 'Shared Secret',
			name: 'sharedSecret',
			type: 'string',
			default: '',
		},
	];
}
