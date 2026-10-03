import { defineNode } from '@n8n/node-sdk';

/** Changes the fields, order, count and shape of items. Needs no service and no credential. */
export const itemsNode = defineNode({ id: 'items', displayName: 'Items' });
