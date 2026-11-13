/**
 * Nodes that run code through n8n's `JsTaskRunnerSandbox` (`startRunnerTask`):
 * the host runs the code in its own code runner.
 */
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';
import { runJsTask } from '../task-runner';

describe('task runner jobs', () => {
	const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });

	it('sorts items with the code of a Sort node', async () => {
		const out = await runner.run(
			parseNodeStepArgs({
				name: 'Sort',
				type: 'n8n-nodes-base.sort',
				typeVersion: 1,
				parameters: { type: 'code', code: 'return a.json.n - b.json.n;' },
				items: [{ n: 3 }, { n: 1 }, { n: 2 }],
			}),
			{ step: 'Sort', key: 'k1' },
		);
		expect(out).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
	});

	it('runs the generated code of an AI Transform node', async () => {
		const out = await runner.run(
			parseNodeStepArgs({
				name: 'AI Transform',
				type: 'n8n-nodes-base.aiTransform',
				typeVersion: 1,
				parameters: {
					jsCode: 'return $input.all().map((i) => ({ json: { twice: i.json.n * 2 } }));',
				},
				items: [{ n: 1 }, { n: 4 }],
			}),
			{ step: 'AI Transform', key: 'k2' },
		);
		expect(out).toEqual([{ twice: 2 }, { twice: 8 }]);
	});

	it('runs each item of a chunk and gives the additional properties', async () => {
		const result = await runJsTask(
			{
				code: 'return { n: $json.n + offset, index: $itemIndex };',
				nodeMode: 'runOnceForEachItem',
				chunk: { startIndex: 1, count: 2 },
				additionalProperties: { offset: 10 },
			},
			[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }, { json: { n: 4 } }],
			{ name: 'Code' },
		);
		expect(result).toEqual({
			ok: true,
			result: [
				{ n: 12, index: 1 },
				{ n: 13, index: 2 },
			],
		});
	});

	it('gives the error of the code as a failed result', async () => {
		const result = await runJsTask(
			{ code: 'throw new Error("bad input");', nodeMode: 'runOnceForAllItems' },
			[{ json: {} }],
			{ name: 'Code' },
		);
		expect(result).toEqual({ ok: false, error: { message: 'bad input' } });
	});
});
