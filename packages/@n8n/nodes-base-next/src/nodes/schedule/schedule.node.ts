import { defineNode } from '@n8n/node-sdk';

/** The legacy Schedule Trigger node. n8n registers its schedules, so n8n runs the legacy node. */
export const schedule = defineNode({ id: 'schedule', displayName: 'Schedule' });
