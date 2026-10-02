import { defineNode } from '@n8n/node-sdk';

/** The built-in Schedule Trigger node. n8n registers its schedules, so n8n runs the built-in node. */
export const schedule = defineNode({ id: 'schedule', displayName: 'Schedule' });
