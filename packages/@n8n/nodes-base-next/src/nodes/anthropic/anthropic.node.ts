import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

const DEFAULT_URL = 'https://api.anthropic.com';

export const anthropicKey = credentialType({
	id: 'anthropic.apiKey',
	legacyName: 'anthropicApi',
	displayName: 'Anthropic',
	docs: 'anthropic',
	fields: {
		apiKey: t.secret('API Key'),
		url: t
			.url('Base URL')
			.default(DEFAULT_URL)
			.describe('Override the default base URL for the API'),
	},
	baseUrl: '{url}',
	hosts: ['api.anthropic.com'],
	auth: (a) => a.apply({ headers: { 'x-api-key': '{apiKey}' }, userHeader: true }),
	test: { get: '/v1/models', headers: { 'anthropic-version': '2023-06-01' } },
});

export const anthropic = defineNode({
	id: 'anthropic',
	displayName: 'Anthropic',
	credential: credential({ types: [anthropicKey] }),
	baseUrl: DEFAULT_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatAnthropic'],
});
