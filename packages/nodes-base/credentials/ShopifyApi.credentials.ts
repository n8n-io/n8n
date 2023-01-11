import { BINARY_ENCODING } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
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
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			required: true,
			type: 'string',
			typeOptions: { password: true },
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

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.password}`).toString(
				BINARY_ENCODING,
			)}`,
		};
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.shopSubdomain}}.myshopify.com/admin/api/2019-10',
			url: '/products.json',
		},
	};
}
