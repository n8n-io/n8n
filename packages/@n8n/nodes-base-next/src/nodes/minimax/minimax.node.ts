import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

const INTERNATIONAL = 'https://api.minimax.io/v1';

export const minimaxKey = defineCredential({
	id: 'minimax.apiKey',
	legacyName: 'minimaxApi',
	displayName: 'MiniMax',
	docs: 'minimax',
	fields: {
		apiKey: field.secret('API Key'),
		region: field
			.options('Region', {
				international: {
					name: 'International',
					description: 'platform.minimax.io - international endpoint',
				},
				china: { name: 'China', description: 'platform.minimaxi.com - mainland China endpoint' },
			})
			.default('international'),
		// The langchain MiniMax node reads `url`.
		url: field.baseUrl(),
	},
	baseUrl: {
		on: 'region',
		values: { international: INTERNATIONAL, china: 'https://api.minimaxi.com/v1' },
	},
	hosts: ['api.minimax.io', 'api.minimaxi.com'],
	auth: (a) => a.bearer('apiKey'),
	// MiniMax answers 200 to a bad key, with the error code in the body.
	test: {
		get: '/files/list?purpose=voice_clone',
		failWhen: [
			{
				body: { base_resp: { status_code: 1004 } },
				message: 'Authentication failed. Please check your API key.',
			},
			{
				body: { base_resp: { status_code: 2049 } },
				message: 'Invalid API key. Please verify your key matches the selected region.',
			},
		],
	},
});

export const minimax = defineNode({
	id: 'minimax',
	displayName: 'MiniMax',
	credential: credential({ types: [minimaxKey] }),
	baseUrl: INTERNATIONAL,
	replaces: ['@n8n/n8n-nodes-langchain.lmChatMinimax'],
});
