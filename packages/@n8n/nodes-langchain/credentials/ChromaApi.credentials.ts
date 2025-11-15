import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class ChromaApi implements ICredentialType {
	name = 'chromaApi';

	displayName = 'Chroma API';

	documentationUrl = 'chroma';

	properties: INodeProperties[] = [
		{
			displayName: 'Deployment Type',
			name: 'deploymentType',
			type: 'options',
			options: [
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
					description: 'Connect to a self-hosted ChromaDB instance',
				},
				{
					name: 'Cloud',
					value: 'cloud',
					description: 'Connect to Chroma Cloud',
				},
			],
			default: 'selfHosted',
		},
		// Self-Hosted Configuration
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:8000',
			placeholder: 'http://localhost:8000',
			description: 'The URL of your ChromaDB instance',
			required: true,
			displayOptions: {
				show: {
					deploymentType: ['selfHosted'],
				},
			},
			validateType: 'url',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			displayOptions: {
				show: {
					deploymentType: ['selfHosted'],
				},
			},
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'Token',
					value: 'token',
				},
			],
			default: 'none',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					deploymentType: ['selfHosted'],
					authentication: ['apiKey'],
				},
			},
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				show: {
					deploymentType: ['selfHosted'],
					authentication: ['token'],
				},
			},
		},
		// Cloud Configuration
		{
			displayName: 'API Key',
			name: 'cloudApiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: {
					deploymentType: ['cloud'],
				},
			},
			description: 'Your Chroma Cloud API key',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenant',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					deploymentType: ['cloud'],
				},
			},
			description: 'Optional: Tenant ID (auto-resolved if API key is scoped to single DB)',
		},
		{
			displayName: 'Database Name',
			name: 'database',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					deploymentType: ['cloud'],
				},
			},
			description: 'Optional: Database name (auto-resolved if API key is scoped to single DB)',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.deploymentType === "selfHosted" ? $credentials.baseUrl : "https://api.trychroma.com"}}',
			url: '={{$credentials.deploymentType === "selfHosted" ? "/api/v1/heartbeat" : "/api/v1"}}',
			method: 'GET',
			headers: {
				'api-key': '={{$credentials.deploymentType === "cloud" ? $credentials.cloudApiKey : ""}}',
				Authorization:
					'={{$credentials.deploymentType === "selfHosted" && $credentials.authentication === "apiKey" ? "Bearer " + $credentials.apiKey : ""}}',
				'X-Chroma-Token':
					'={{$credentials.deploymentType === "selfHosted" && $credentials.authentication === "token" ? $credentials.token : ""}}',
			},
		},
	};
}
