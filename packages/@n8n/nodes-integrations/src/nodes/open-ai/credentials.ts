import { defineCredential, field } from '@n8n/node-sdk/credentials';

const DEFAULT_URL = 'https://api.openai.com/v1';

export const openAiKey = defineCredential({
	id: 'openAi.apiKey',
	version: '1.0.0',
	legacyName: 'openAiApi',
	displayName: 'OpenAI',
	docs: 'openai',
	fields: {
		apiKey: field.secret('API Key'),
		organizationId: field
			.text('Organization ID (optional)')
			.optional()
			.hint('Only required if you belong to multiple organisations')
			.describe(
				"For users who belong to multiple organizations, you can set which organization is used for an API request. Usage from these API requests will count against the specified organization's subscription quota.",
			),
		// It may point at an OpenAI-compatible server.
		url: field
			.url('Base URL')
			.default(DEFAULT_URL)
			.describe('Override the default base URL for the API'),
	},
	baseUrl: '{url}',
	hosts: ['api.openai.com'],
	auth: (a) =>
		a.apply({
			headers: { Authorization: 'Bearer {apiKey}', 'OpenAI-Organization': '{organizationId}' },
			userHeader: true,
		}),
	test: { get: '/models' },
});
