import { defineNode } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { whatsAppApp } from './credentials';

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
