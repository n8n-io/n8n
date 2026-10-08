import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { openAiKey } from './credentials';

const DEFAULT_URL = 'https://api.openai.com/v1';

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
