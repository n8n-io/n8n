import { t } from '@n8n/node-sdk';

import { heldItems, holdUntil, wait } from '../wait.node';

const SECONDS = { seconds: 1, minutes: 60, hours: 3600, days: 86_400 } as const;

export const waitInterval = wait.action('interval', {
	action: 'Wait for a time interval',
	summary: 'Hold the items for an amount of time, then pass them on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	imports: ['wait'],
	input: {
		amount: t.num().with({ minimum: 0 }),
		unit: t.oneOf('seconds', 'minutes', 'hours', 'days'),
	},
	output: heldItems,
	async *run({ input, items, wait: host }) {
		const at = new Date(Date.now() + input.amount * SECONDS[input.unit] * 1000);
		yield* holdUntil(at, items, host);
	},
});
