import { defineNode } from '@n8n/node-sdk';

/** Fails the execution with a message, e.g. on a path that must not happen. */
export const stopAndError = defineNode({ id: 'stopAndError', displayName: 'Stop and Error' });
