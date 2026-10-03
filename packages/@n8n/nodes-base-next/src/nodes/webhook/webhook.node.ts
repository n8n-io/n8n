import { defineNode } from '@n8n/node-sdk';

/**
 * The legacy Webhook and Respond to Webhook nodes. n8n serves their test and production URLs,
 * so the contracts type their parameters and items, and n8n runs the legacy nodes.
 */
export const webhook = defineNode({ id: 'webhook', displayName: 'Webhook' });
