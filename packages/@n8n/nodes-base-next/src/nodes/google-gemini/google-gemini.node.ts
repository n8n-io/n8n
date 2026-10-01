import { compat, credential, defineNode } from '@n8n/node-sdk';

export const googleGemini = defineNode({
	id: 'googleGemini',
	displayName: 'Google Gemini',
	credential: credential({ types: [compat('googlePalmApi')] }),
	baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
});

export const text = googleGemini.resource('text');
