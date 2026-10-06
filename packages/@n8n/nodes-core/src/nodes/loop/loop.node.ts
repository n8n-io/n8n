import { defineNode } from '@n8n/node-sdk';

/**
 * The legacy Loop Over Items node. n8n treats its type in a special way (partial runs, step
 * runs, the canvas), so the `forEach` region of the flow SDK emits the legacy node.
 */
export const loop = defineNode({ id: 'loop', displayName: 'Loop Over Items' });
