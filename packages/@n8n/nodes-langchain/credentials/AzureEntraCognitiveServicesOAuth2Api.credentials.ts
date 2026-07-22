import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = ['openid', 'offline_access'];

export class AzureEntraCognitiveServicesOAuth2Api implements ICredentialType {
	name = 'azureEntraCognitiveServicesOAuth2Api';

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2
	displayName = 'Azure Entra ID (Azure Active Directory) API';

	extends = ['oAuth2Api'];

	documentationUrl = 'azureentracognitiveservicesoauth2api';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
			description: 'The Azure OpenAI API version to use',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: 'common',
			description:
				'Enter your Azure Tenant ID (Directory ID) or keep "common" for multi-tenant apps. Required for OAuth2 authentication with Entra ID.',
			placeholder: 'e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or common',
		},
		{
			displayName: 'Use APIM (Azure API Management)',
			name: 'useApim',
			type: 'boolean',
			default: false,
			description:
				'Enable if accessing Azure OpenAI through Azure API Management gateway. When enabled, you can configure a custom APIM endpoint with query parameters and headers.',
		},
		// APIM fields - shown when useApim is true
		{
			displayName: 'APIM Endpoint',
			name: 'apimBasePath',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					useApim: [true],
				},
			},
			default: '',
			placeholder: 'https://your-apim.azure-api.net',
			description:
				'The APIM gateway base URL (e.g., https://my-apim.azure-api.net). The path /openai/deployments/{model}/chat/completions will be appended automatically.',
		},
		{
			displayName: 'APIM Query Parameters',
			name: 'apimQueryParams',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					useApim: [true],
				},
			},
			default: {},
			placeholder: 'Add Query Parameter',
			description:
				'Custom query parameters to include with every LLM API request (e.g., subscription-key)',
			options: [
				{
					name: 'params',
					displayName: 'Parameters',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: 'subscription-key',
							description: 'Query parameter name',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							typeOptions: {
								password: true,
							},
							description: 'Query parameter value',
						},
					],
				},
			],
		},
		{
			displayName: 'APIM Headers',
			name: 'apimHeaders',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					useApim: [true],
				},
			},
			default: {},
			placeholder: 'Add Header',
			description:
				'Custom headers to include with every LLM API request (e.g., Ocp-Apim-Subscription-Key)',
			options: [
				{
					name: 'headers',
					displayName: 'Headers',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: 'Ocp-Apim-Subscription-Key',
							description: 'Header name',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							typeOptions: {
								password: true,
							},
							description: 'Header value',
						},
					],
				},
			],
		},
		{
			displayName: 'Approved Models',
			name: 'approvedModels',
			type: 'string',
			default: '',
			description:
				'Comma-separated list of approved model/deployment names for the dropdown (e.g., "gpt-4o,gpt-4o-mini,o3-mini"). Leave empty to allow manual entry.',
			placeholder: 'gpt-4o,gpt-4o-mini,o3-mini',
		},
		// Direct Azure OpenAI fields - shown when useApim is false
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			displayOptions: {
				show: {
					useApim: [false],
				},
			},
			default: '',
			description: 'The name of your Azure OpenAI resource',
			placeholder: 'my-azure-openai-resource',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			displayOptions: {
				show: {
					useApim: [false],
				},
			},
			default: undefined,
			placeholder: 'https://westeurope.api.cognitive.microsoft.com',
			description:
				'Optional custom endpoint URL. If not provided, the standard Azure OpenAI URL is used.',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://login.microsoftonline.com/{{$self["tenantId"]}}/oauth2/token',
		},
		{
			displayName: 'Additional Body Properties',
			name: 'additionalBodyProperties',
			type: 'hidden',
			default:
				'{"grant_type": "client_credentials", "resource": "https://cognitiveservices.azure.com/"}',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description:
				'Define custom scopes. You might need this if the default scopes are not sufficient or if you want to minimize permissions. Ensure you include "openid" and "offline_access".',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: '',
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: defaultScopes.join(' '),
			placeholder: 'openid offline_access',
			description: 'Space-separated list of scopes to request.',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{ $self.customScopes ? $self.enabledScopes : "' + defaultScopes.join(' ') + '"}}',
		},
	];
}
