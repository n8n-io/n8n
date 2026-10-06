import { t } from '@n8n/node-sdk';

import { heldItems, holdUntil, wait } from '../wait.node';

export const waitUntil = wait.action('until', {
	action: 'Wait until a time',
	summary: 'Hold the items until a date and time, then pass them on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	imports: ['wait'],
	input: {
		// A time without an offset means another moment on each host. The `date-time` check requires one.
		time: t
			.dateTime()
			.title('Date and Time')
			.hint('ISO 8601 with an offset, e.g. 2026-09-01T09:00:00+02:00'),
	},
	output: heldItems,
	async *run({ input, items, wait: host }) {
		yield* holdUntil(new Date(input.time), items, host);
	},
});
