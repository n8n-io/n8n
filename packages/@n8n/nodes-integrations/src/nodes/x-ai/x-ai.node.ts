import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { xAiKey } from './credentials';

const BASE_URL = 'https://api.x.ai/v1';

export const xAi = defineNode({
	id: 'xAi',
	displayName: 'xAI Grok',
	credential: credential({ types: [xAiKey] }),
	baseUrl: BASE_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatXAiGrok'],
});
