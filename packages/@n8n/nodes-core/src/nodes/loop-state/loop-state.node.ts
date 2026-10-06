import { defineNode } from '@n8n/node-sdk';

/** The item of each pass of a loop region. The loop regions of the flow SDK build it. */
export const loopState = defineNode({ id: 'loopState', displayName: 'Loop state' });
