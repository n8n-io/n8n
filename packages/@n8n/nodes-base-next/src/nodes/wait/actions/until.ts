import { t } from '@n8n/node-sdk';

import { heldItems, holdUntil, wait } from '../wait.node';

// A time without an offset means another moment on each host, so the offset is required.
const DATE_TIME = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:\\d{2})$';

export const waitUntil = wait.action('until', {
	action: 'Wait until a time',
	summary: 'Hold the items until a date and time, then pass them on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	imports: ['wait'],
	input: {
		time: t
			.str()
			.with({ format: 'date-time', pattern: DATE_TIME })
			.hint('ISO 8601 with an offset, e.g. 2026-09-01T09:00:00+02:00'),
	},
	output: heldItems,
	async *run({ input, items, wait: host }) {
		yield* holdUntil(new Date(input.time), items, host);
	},
});
