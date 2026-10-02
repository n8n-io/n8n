import { defineNode } from '@n8n/node-sdk';

/** The built-in Manual Trigger node. The editor's Execute button and test runs start it. */
export const manual = defineNode({ id: 'manual', displayName: 'Manual' });
