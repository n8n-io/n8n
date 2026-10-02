import { compat, credential, defineNode } from '@n8n/node-sdk';

export const googleGemini = defineNode({
	id: 'googleGemini',
	displayName: 'Google Gemini',
	credential: credential({
		types: [compat('googlePalmApi', { hosts: ['generativelanguage.googleapis.com'] })],
	}),
	baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
	// The langchain Gemini node stays in search for its image, audio, document and video operations.
	replaces: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
});

export const text = googleGemini.resource('text');
