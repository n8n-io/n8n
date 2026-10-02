import { compat, credential, defineNode } from '@n8n/node-sdk';

/**
 * The built-in WhatsApp Trigger node. It answers the Meta verification request and registers
 * the app subscription, so n8n runs the built-in node. Its credential is the Meta app, not the
 * WhatsApp sender of the WhatsApp actions.
 */
export const whatsAppTrigger = defineNode({
	id: 'whatsAppTrigger',
	displayName: 'WhatsApp Trigger',
	credential: credential({ types: [compat('whatsAppTriggerApi')] }),
});
