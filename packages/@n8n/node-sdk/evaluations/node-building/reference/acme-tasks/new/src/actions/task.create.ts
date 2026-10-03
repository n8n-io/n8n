import { matches, path, t } from '@n8n/node-sdk';

import { tasks } from '../acme-tasks.node';
import { task } from '../task';

export const createTask = tasks.action('create', {
	action: 'Create a task',
	summary: 'Create an Acme task.',
	flow: { effect: 'write', cardinality: 'per-item' },
	input: { title: t.str().with({ minLength: 1 }), assignee: t.str().optional() },
	output: task,
	async run({ input, http }) {
		const created = await http.request({
			method: 'POST',
			path: path`/tasks`,
			body: { title: input.title, ...(input.assignee ? { assignee: input.assignee } : {}) },
		});
		if (!matches(task, created)) throw new Error('Acme Tasks returned an unexpected task');
		return created;
	},
});
