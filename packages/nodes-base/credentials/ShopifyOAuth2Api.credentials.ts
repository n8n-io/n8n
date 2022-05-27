import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShopifyOAuth2Api implements ICredentialType {
	name = 'shopifyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Shopify OAuth2 API';
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
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://{{$self["shopSubdomain"]}}.myshopify.com/admin/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self["shopSubdomain"]}}.myshopify.com/admin/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'write_orders,read_orders,write_products,read_products',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
