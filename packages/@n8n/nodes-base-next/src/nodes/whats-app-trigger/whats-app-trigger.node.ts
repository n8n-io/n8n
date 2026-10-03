import { defineNode } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

/** The Meta app. The legacy trigger node reads the secret to verify each delivery. */
export const whatsAppApp = defineCredential({
	id: 'whatsApp.app',
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

/**
 * The legacy WhatsApp Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the legacy node. Its credential is the Meta app, not the
 * WhatsApp sender of the WhatsApp actions.
 */
export const whatsAppTrigger = defineNode({
	id: 'whatsAppTrigger',
	displayName: 'WhatsApp Trigger',
	credential: credential({ types: [whatsAppApp] }),
});
