import { defineCredential, field } from '@n8n/node-sdk/credentials';

// The legacy node pins this Graph API version; Meta serves an expired version as the oldest live one.
const GRAPH_API = 'https://graph.facebook.com/v13.0';

export const whatsAppToken = defineCredential({
	id: 'whatsApp.token',
	version: '1.0.0',
	legacyName: 'whatsAppApi',
	displayName: 'WhatsApp API',
	docs: 'whatsapp',
	fields: {
		accessToken: field.secret('Access Token'),
		businessAccountId: field.text('Business Account ID'),
	},
	baseUrl: GRAPH_API,
	hosts: ['graph.facebook.com'],
	auth: (a) => a.bearer('accessToken'),
	test: {
		get: '/',
		ignoreHttpStatusErrors: true,
		failWhen: [{ body: { error: { type: 'OAuthException' } }, message: 'Invalid access token' }],
	},
});
