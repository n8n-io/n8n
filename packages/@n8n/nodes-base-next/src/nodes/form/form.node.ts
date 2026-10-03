import { defineNode } from '@n8n/node-sdk';

/** The legacy Form Trigger node. n8n serves its form pages, so n8n runs the legacy node. */
export const form = defineNode({ id: 'form', displayName: 'Form' });
