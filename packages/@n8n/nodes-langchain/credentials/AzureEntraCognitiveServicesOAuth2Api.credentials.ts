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
			displayName: 'Endpoint Type',
			name: 'endpointType',
			type: 'options',
			options: [
				{ name: 'Classic', value: 'classic' },
				{ name: 'Azure AI Foundry', value: 'foundry' },
			],
			default: 'classic',
			description:
				'Classic targets *.openai.azure.com (resource name + deployment-based URLs). Azure AI Foundry targets *.services.ai.azure.com/openai/v1 (full endpoint URL).',
		},
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { endpointType: ['classic'] } },
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			required: true,
			default: '2025-03-01-preview',
			displayOptions: { show: { endpointType: ['classic'] } },
		},
		{
			displayName: 'Endpoint',
			name: 'foundryEndpoint',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://<resource>.services.ai.azure.com/openai/v1',
			displayOptions: { show: { endpointType: ['foundry'] } },
			hint: 'The full Azure AI Foundry OpenAI-compatible base URL.',
		},
		{
			displayName: 'Endpoint',
			name: 'endpoint',
			type: 'string',
			default: undefined,
			placeholder: 'https://<resource>.openai.azure.com',
			displayOptions: { show: { endpointType: ['classic'] } },
			hint: 'Optional. Defaults to https://<resourceName>.openai.azure.com.',
		},
		{
			displayName: 'Tenant ID',
			name: 'tenantId',
			type: 'string',
			default: 'common',
			description:
				'Enter your Azure Tenant ID (Directory ID) or keep "common" for multi-tenant apps. Using a specific Tenant ID is generally recommended and required for certain authentication flows.',
			placeholder: 'e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or common',
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
