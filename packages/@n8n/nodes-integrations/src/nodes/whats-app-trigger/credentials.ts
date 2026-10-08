import { defineCredential, field } from '@n8n/node-sdk/credentials';

/** The Meta app. The legacy trigger node reads the secret to verify each delivery. */
export const whatsAppApp = defineCredential({
	id: 'whatsApp.app',
	version: '1.0.0',
	legacyName: 'whatsAppTriggerApi',
	displayName: 'WhatsApp OAuth API',
	docs: 'whatsapp',
	fields: { clientId: field.text('Client ID'), clientSecret: field.secret('Client Secret') },
	baseUrl: 'https://graph.facebook.com/v19.0',
	auth: (a) => a.none(),
	test: {
		post: '/oauth/access_token',
		body: {
			client_id: '{clientId}',
			client_secret: '{clientSecret}',
			grant_type: 'client_credentials',
		},
	},
});
