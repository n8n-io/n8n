import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { geminiKey } from './credentials';

export const googleGemini = defineNode({
	id: 'googleGemini',
	displayName: 'Google Gemini',
	credential: credential({ types: [geminiKey] }),
	baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
	// The langchain Gemini node stays in search for its image, audio, document and video operations.
	replaces: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
});

export const text = googleGemini.resource('text');
