import { bool, int, oneOf } from '@n8n/node-sdk';

import { tasks } from '../acme-tasks.node';
import { listTasks, task } from '../task';

export const getManyTasks = tasks.action('getAll', {
	action: 'Get many tasks',
	summary: 'List Acme tasks, optionally filtered by status.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		status: oneOf('any', 'open', 'done').default('any'),
		returnAll: bool().default(false),
		limit: int().with({ minimum: 1 }).default(50),
	},
	output: task,
	async *run({ input, http }) {
		const status = input.status === 'any' ? undefined : input.status;
		const limit = input.returnAll ? Infinity : (input.limit ?? 50);
		yield* await listTasks(http, status, limit);
	},
});
