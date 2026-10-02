import { compat, credential, defineNode, oneOf } from '@n8n/node-sdk';

const INTERNATIONAL = 'https://api.minimax.io/v1';

export const minimax = defineNode({
	id: 'minimax',
	displayName: 'MiniMax',
	credential: credential({
		types: [
			compat('minimaxApi', {
				fields: { region: oneOf('international', 'china').default('international') },
				hosts: ['api.minimax.io', 'api.minimaxi.com'],
				baseUrl: {
					on: 'region',
					values: { international: INTERNATIONAL, china: 'https://api.minimaxi.com/v1' },
				},
			}),
		],
	}),
	baseUrl: INTERNATIONAL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatMinimax'],
});
