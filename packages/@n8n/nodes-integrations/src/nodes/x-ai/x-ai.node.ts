import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

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

export const xAi = defineNode({
	id: 'xAi',
	displayName: 'xAI Grok',
	credential: credential({ types: [xAiKey] }),
	baseUrl: BASE_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatXAiGrok'],
});
