import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShopifyAccessTokenApi implements ICredentialType {
	name = 'shopifyAccessTokenApi';
	displayName = 'Shopify Access Token API';
	documentationUrl = 'shopify';
	properties: INodeProperties[] = [
		{
			displayName: 'Shop Subdomain',
			name: 'shopSubdomain',
			required: true,
			type: 'string',
			default: '',
			description: 'Only the subdomain without .myshopify.com',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'APP Secret Key',
			name: 'appSecretKey',
			required: true,
			type: 'string',
			default: '',
			description: 'Secret key needed to verify the webhook when using Shopify Trigger node',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Shopify-Access-Token': '={{$credentials?.accessToken}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials?.shopSubdomain}}.myshopify.com/admin/api/2019-10',
			url: '/products.json',
		},
	};
}
