import { t } from '@n8n/node-sdk';

import { row, toFilter, where } from '../data-table.node';

export const rowExists = row.action('exists', {
	action: 'Check row exists',
	summary: 'Send each item to exists or missing: does a row match the conditions? Items pass on.',
	flow: { effect: 'read', cardinality: 'per-item' },
	imports: ['dataTables'],
	input: { where },
	output: t.passedItem(),
	outputs: ['exists', 'missing'],
	async run({ input, item, dataTables }) {
		const table = await dataTables.open(input.table);
		const { rows } = await table.rows({ filter: toFilter(input.where), limit: 1 });
		const to: 'exists' | 'missing' = rows.length > 0 ? 'exists' : 'missing';
		return { to, item };
	},
});
