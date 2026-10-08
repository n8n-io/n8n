import { defineCredential, field } from '@n8n/node-sdk/credentials';

export const geminiKey = defineCredential({
	id: 'googleGemini.apiKey',
	version: '1.0.0',
	legacyName: 'googlePalmApi',
	displayName: 'Google Gemini(PaLM) Api',
	docs: 'google',
	fields: {
		host: field.url('Host').default('https://generativelanguage.googleapis.com'),
		apiKey: field.secret('API Key'),
	},
	baseUrl: '{host}/v1beta',
	hosts: ['generativelanguage.googleapis.com'],
	auth: (a) => a.query('key', '{apiKey}'),
	test: { get: '/models' },
});
