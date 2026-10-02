import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

const BASE_URL = 'https://api.x.ai/v1';

export const xAiKey = credentialType({
	id: 'xAi.apiKey',
	legacyName: 'xAiApi',
	displayName: 'xAi',
	docs: 'xai',
	// The langchain xAI Grok node reads `url`.
	fields: { apiKey: t.secret('API Key'), url: t.baseUrl() },
	baseUrl: BASE_URL,
	hosts: ['api.x.ai'],
	auth: (a) => a.bearer('apiKey'),
	test: { get: '/models' },
});

export const xAi = defineNode({
	id: 'xAi',
	displayName: 'xAI Grok',
	credential: credential({ types: [xAiKey] }),
	baseUrl: BASE_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatXAiGrok'],
});
