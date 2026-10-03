import { defineNode } from '@n8n/node-sdk';

/** Routes and filters items by conditions. Needs no service and no credential. */
export const conditionNode = defineNode({ id: 'condition', displayName: 'Condition' });
