import { compat, credential, defineNode, str } from '@n8n/node-sdk';

const DEFAULT_URL = 'https://api.anthropic.com';

export const anthropic = defineNode({
	id: 'anthropic',
	displayName: 'Anthropic',
	credential: credential({
		types: [
			compat('anthropicApi', {
				fields: { url: str().default(DEFAULT_URL) },
				hosts: ['api.anthropic.com'],
				baseUrl: ({ url }) => url || DEFAULT_URL,
			}),
		],
	}),
	baseUrl: DEFAULT_URL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatAnthropic'],
});
