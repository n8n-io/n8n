import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

const DEFAULT_URL = 'https://api.openai.com/v1';

export const openAiKey = credentialType({
	id: 'openAi.apiKey',
	legacyName: 'openAiApi',
	displayName: 'OpenAI',
	docs: 'openai',
	fields: {
		apiKey: t.secret('API Key'),
		organizationId: t
			.text('Organization ID (optional)')
			.optional()
			.hint('Only required if you belong to multiple organisations')
			.describe(
				"For users who belong to multiple organizations, you can set which organization is used for an API request. Usage from these API requests will count against the specified organization's subscription quota.",
			),
		// It may point at an OpenAI-compatible server.
		url: t
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

export const openAi = defineNode({
	id: 'openAi',
	displayName: 'OpenAI',
	credential: credential({ types: [openAiKey] }),
	baseUrl: DEFAULT_URL,
	// The langchain OpenAI node stays in search for its audio, file and assistant operations.
	replaces: [
		'@n8n/n8n-nodes-langchain.lmChatOpenAi',
		'@n8n/n8n-nodes-langchain.lmOpenAi',
		'n8n-nodes-base.openAi',
	],
});

export const image = openAi.resource('image');
export const text = openAi.resource('text');
