import { t } from '@n8n/node-sdk';

import { manual } from '../manual.node';

/** The Manual Trigger node, version 1. The flow SDK emits it with `manual({ sample })`. */
export const manualTrigger = manual.trigger('trigger', {
	trigger: 'On manual run',
	summary: 'Starts the workflow with one empty item when a user runs it by hand.',
	input: {},
	// A run by hand can start with any items, so `sample` in the flow types the output.
	output: t.json(),
	native: { type: 'n8n-nodes-base.manualTrigger', version: 1, on: 'manual' },
});
