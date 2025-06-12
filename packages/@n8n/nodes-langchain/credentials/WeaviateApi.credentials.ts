import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class WeaviateApi implements ICredentialType {
	name = 'weaviateApi';

	displayName = 'Weaviate Credentials';

	documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/weaviate/';

	properties: INodeProperties[] = [
		{
			displayName: 'Weaviate Cloud Endpoint',
			name: 'weaviate_cloud_endpoint',
			description:
				'The Endpoint of a Weaviate Cloud instance. Leave empty if not using Weaviate Cloud.',
			placeholder: 'https://your-cluster.weaviate.cloud',
			type: 'string',
			required: false,
			default: '',
		},
		{
			displayName: 'Weaviate Api Key',
			name: 'weaviate_api_key',
			description:
				'The API key for the Weaviate instance. Used for both Cloud and Custom Connection.',
			type: 'string',
			typeOptions: { password: true },
			required: false,
			default: '',
		},
		{
			displayName: 'Custom Connection HTTP Host',
			name: 'custom_connection_http_host',
			description: 'The host of your Weaviate instance. Not used if using Weaviate Cloud.',
			type: 'string',
			required: false,
			default: 'weaviate',
		},
		{
			displayName: 'Custom Connection HTTP Port',
			name: 'custom_connection_http_port',
			description: 'The port of your Weaviate instance. Not used if using Weaviate Cloud.',
			type: 'number',
			required: false,
			default: 8080,
		},
		{
			displayName: 'Custom Connection HTTP Secure',
			name: 'custom_connection_http_secure',
			description: 'Whether to use a secure connection for HTTP. Not used if using Weaviate Cloud.',
			type: 'boolean',
			required: false,
			default: false,
		},
		{
			displayName: 'Custom Connection gRPC Host',
			name: 'custom_connection_grpc_host',
			description: 'The gRPC host of your Weaviate instance. Not used if using Weaviate Cloud.',
			type: 'string',
			required: false,
			default: 'weaviate',
		},
		{
			displayName: 'Custom Connection gRPC Port',
			name: 'custom_connection_grpc_port',
			description: 'The gRPC port of your Weaviate instance. Not used if using Weaviate Cloud.',
			type: 'number',
			required: false,
			default: 50051,
		},
		{
			displayName: 'Custom Connection gRPC Secure',
			name: 'custom_connection_grpc_secure',
			description: 'Whether to use a secure connection for gRPC. Not used if using Weaviate Cloud.',
			type: 'boolean',
			required: false,
			default: false,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.weaviate_cloud_endpoint?$credentials.weaviate_cloud_endpoint.startsWith("http://") || $credentials.weaviate_cloud_endpoint.startsWith("https://")?$credentials.weaviate_cloud_endpoint:"https://" + $credentials.weaviate_cloud_endpoint:($credentials.custom_connection_http_secure ? "https" : "http") + "://" + $credentials.custom_connection_http_host + ":" + $credentials.custom_connection_http_port }}',
			url: '/v1/nodes',
			disableFollowRedirect: false,
			headers: {
				Authorization:
					'={{$if($credentials.weaviate_api_key, "Bearer " + $credentials.weaviate_api_key, undefined)}}',
			},
		},
	};
}
