import { defineNode } from '@n8n/node-sdk';

/** Transform and routing actions that need no service and no credential. */
export const core = defineNode({ id: 'core', displayName: 'Core' });
