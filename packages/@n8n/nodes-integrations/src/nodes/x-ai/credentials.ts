import { defineCredential, field } from '@n8n/node-sdk/credentials';

const BASE_URL = 'https://api.x.ai/v1';

export const xAiKey = defineCredential({
	id: 'xAi.apiKey',
	version: '1.0.0',
	legacyName: 'xAiApi',
	displayName: 'xAi',
	docs: 'xai',
	// The langchain xAI Grok node reads `url`.
	fields: { apiKey: field.secret('API Key'), url: field.baseUrl() },
	baseUrl: BASE_URL,
	hosts: ['api.x.ai'],
	auth: (a) => a.bearer('apiKey'),
	test: { get: '/models' },
});
