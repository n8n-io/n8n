import type { CodeTaskData } from '@n8n/code-task-contract';

import { createTaskContext, runInTaskContext } from '../task-context';
import { createTaskData } from '../task-data';
import { newTaskData } from './fixtures';

async function run(code: string, data: CodeTaskData) {
	const { getBuiltIns } = createTaskData({ data });
	return await runInTaskContext(code, createTaskContext(getBuiltIns(0)));
}

describe('createTaskData', () => {
	it('gives the code the input, other nodes, the workflow and the execution', async () => {
		const data = newTaskData([{ json: { a: 1 } }, { json: { a: 2 } }]);

		const result = await run(
			`return {
				json: $json.a,
				all: $input.all().map((item) => item.json.a),
				trigger: $('Trigger').last().json.a,
				workflow: $workflow.name,
				execution: [$execution.id, $execution.mode],
				vars: $vars.color,
			}`,
			data,
		);

		expect(result).toEqual({
			json: 1,
			all: [1, 2],
			trigger: 2,
			workflow: 'My workflow',
			execution: ['exec', 'test'],
			vars: 'red',
		});
	});

	it('keeps the index of the items in a chunk', async () => {
		const data = newTaskData([{ json: { a: 3 } }]);

		const { items, getBuiltIns } = createTaskData({ data, chunk: { startIndex: 2, count: 1 } });

		expect(items).toHaveLength(3);
		expect(getBuiltIns(2).$json).toEqual({ a: 3 });
	});
});
