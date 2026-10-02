import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

export const geminiKey = credentialType({
	id: 'googleGemini.apiKey',
	legacyName: 'googlePalmApi',
	displayName: 'Google Gemini(PaLM) Api',
	docs: 'google',
	fields: {
		host: t.url('Host').default('https://generativelanguage.googleapis.com'),
		apiKey: t.secret('API Key'),
	},
	baseUrl: '{host}/v1beta',
	hosts: ['generativelanguage.googleapis.com'],
	auth: (a) => a.query('key', '{apiKey}'),
	test: { get: '/models' },
});

export const googleGemini = defineNode({
	id: 'googleGemini',
	displayName: 'Google Gemini',
	credential: credential({ types: [geminiKey] }),
	baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
	// The langchain Gemini node stays in search for its image, audio, document and video operations.
	replaces: ['@n8n/n8n-nodes-langchain.lmChatGoogleGemini'],
});

export const text = googleGemini.resource('text');
