import { compat, credential, defineNode, str } from '@n8n/node-sdk';

const DEFAULT_URL = 'https://api.openai.com/v1';

// The legacy type stays the definition. Its base URL may point at a compatible server.
export const openAi = defineNode({
	id: 'openAi',
	displayName: 'OpenAI',
	credential: credential({
		types: [
			compat('openAiApi', {
				fields: { url: str().default(DEFAULT_URL) },
				hosts: ['api.openai.com'],
				baseUrl: ({ url }) => url || DEFAULT_URL,
			}),
		],
	}),
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
