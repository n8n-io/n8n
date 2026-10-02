import { credential, credentialType, defineNode, t } from '@n8n/node-sdk';

/** The Meta app. The built-in trigger reads the secret to verify each delivery. */
export const whatsAppApp = credentialType({
	id: 'whatsApp.app',
	legacyName: 'whatsAppTriggerApi',
	displayName: 'WhatsApp OAuth API',
	docs: 'whatsapp',
	fields: { clientId: t.text('Client ID'), clientSecret: t.secret('Client Secret') },
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
 * The built-in WhatsApp Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the built-in node. Its credential is the Meta app, not the
 * WhatsApp sender of the WhatsApp actions.
 */
export const whatsAppTrigger = defineNode({
	id: 'whatsAppTrigger',
	displayName: 'WhatsApp Trigger',
	credential: credential({ types: [whatsAppApp] }),
});
