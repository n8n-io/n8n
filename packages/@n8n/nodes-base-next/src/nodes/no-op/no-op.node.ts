import { defineNode } from '@n8n/node-sdk';

/** Does nothing: a named point in a flow, e.g. the end of a branch. */
export const noOp = defineNode({ id: 'noOp', displayName: 'No Operation' });
