import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { anthropicKey } from './credentials';

const DEFAULT_URL = 'https://api.anthropic.com';

export const anthropic = defineNode({
	id: 'anthropic',
	displayName: 'Anthropic',
	credential: credential({ types: [anthropicKey] }),
	baseUrl: DEFAULT_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatAnthropic'],
});
