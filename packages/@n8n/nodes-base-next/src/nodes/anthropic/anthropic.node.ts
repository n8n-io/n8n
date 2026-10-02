import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

const DEFAULT_URL = 'https://api.anthropic.com';

export const anthropicKey = defineCredential({
	id: 'anthropic.apiKey',
	legacyName: 'anthropicApi',
	displayName: 'Anthropic',
	docs: 'anthropic',
	fields: {
		apiKey: field.secret('API Key'),
		url: field
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
