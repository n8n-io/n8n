import {
	CODE_TASK_CONTRACT_VERSION,
	type CodeTaskChunk,
	type CodeTaskInput,
} from '@n8n/code-task-contract';

import { runTask } from '../run-task';
import { createTaskConsole } from '../task-console';
import { newTaskData } from './fixtures';

const items = [{ json: { a: 1 } }, { json: { a: 2 } }, { json: { a: 3 } }];

async function run(
	nodeMode: CodeTaskInput['nodeMode'],
	code: string,
	options: { continueOnFail?: boolean; chunk?: CodeTaskChunk } = {},
) {
	const { chunk } = options;
	// n8n sends only the items of the chunk
	const inputItems = chunk ? items.slice(chunk.startIndex, chunk.startIndex + chunk.count) : items;
	const input: CodeTaskInput = {
		version: CODE_TASK_CONTRACT_VERSION,
		taskId: 'task',
		language: 'javascript',
		code,
		nodeMode,
		continueOnFail: options.continueOnFail ?? false,
		chunk,
		data: newTaskData(inputItems),
	};

	return await runTask(input, createTaskConsole().console);
}

describe('runTask', () => {
	it('runs once for all items', async () => {
		const result = await run('runOnceForAllItems', 'return items.map((item) => item.json.a)');

		expect(result).toEqual({ ok: true, result: [1, 2, 3] });
	});

	it('runs once for each item in the chunk and pairs each output item with its input item', async () => {
		const result = await run(
			'runOnceForEachItem',
			'if ($json.a === 3) return null; return { json: { b: item.json.a } }',
			{ chunk: { startIndex: 1, count: 2 } },
		);

		expect(result).toEqual({ ok: true, result: [{ json: { b: 2 }, pairedItem: { item: 1 } }] });
	});

	it('returns the user error with the line of the user code', async () => {
		const result = await run(
			'runOnceForAllItems',
			"const a = 1;\nthrow new TypeError('Bad value')",
		);

		expect(result).toMatchObject({
			ok: false,
			error: { message: 'Bad value [line 2]', description: 'TypeError', lineNumber: 2 },
		});
	});

	it('puts the error message in the output item of a failed item on continue on fail', async () => {
		const result = await run(
			'runOnceForEachItem',
			"if ($json.a === 2) throw new Error('Bad item'); return item",
			{ continueOnFail: true },
		);

		expect(result).toMatchObject({
			ok: true,
			result: [
				{ json: { a: 1 }, pairedItem: { item: 0 } },
				{ json: { error: 'Bad item [line 1]' }, pairedItem: { item: 1 } },
				{ json: { a: 3 }, pairedItem: { item: 2 } },
			],
		});
	});
});
