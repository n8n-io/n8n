import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShopifyTokenApi implements ICredentialType {
	name = 'shopifyTokenApi';
	displayName = 'Shopify Access Token API';
	documentationUrl = 'shopify';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'App Secret Key',
			name: 'appSecretKey',
			required: true,
			type: 'string',
			default: '',
			description: 'Secret key needed to verify the webhook when using Shopify Trigger node',
		},
		{
			displayName: 'Shop Subdomain',
			name: 'shopSubdomain',
			required: true,
			type: 'string',
			default: '',
			description: 'Only the subdomain without .myshopify.com',
		},
	];
	authenticate: IAuthenticateHeaderAuth = {
		type: 'headerAuth',
		properties: {
			name: 'X-Shopify-Access-Token',
			value: '={{$credentials?.accessToken}}',
		},
	};
	test: ICredentialTestRequest = {
	request: {
			baseURL: '=https://{{$credentials?.shopSubdomain}}.myshopify.com/admin/api/2019-10',
			url: '/products.json',
		},
	};
}
