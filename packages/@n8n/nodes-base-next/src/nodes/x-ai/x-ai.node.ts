import { compat, credential, defineNode } from '@n8n/node-sdk';

export const xAi = defineNode({
	id: 'xAi',
	displayName: 'xAI Grok',
	credential: credential({ types: [compat('xAiApi', { hosts: ['api.x.ai'] })] }),
	baseUrl: 'https://api.x.ai/v1',
	replaces: ['@n8n/n8n-nodes-langchain.lmChatXAiGrok'],
});
