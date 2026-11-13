/**
 * The deduplication store of the host (deduplication.ts): the Remove Duplicates
 * node keeps items across executions, and "clear deduplication history" works.
 */
import { NodeStepRunner, parseNodeStepArgs } from '../node-step';

const runner = new NodeStepRunner({ credentials: { get: async () => ({}) } });
const execution = { id: '9', mode: 'production' as const, workflowId: 'wf-dedup' };

function seen(id: number) {
	return parseNodeStepArgs({
		name: 'Remove Duplicates',
		type: 'n8n-nodes-base.removeDuplicates',
		typeVersion: 2,
		parameters: {
			operation: 'removeItemsSeenInPreviousExecutions',
			logic: 'removeItemsWithAlreadySeenKeyValues',
			dedupeValue: '={{ $json.id }}',
			options: {},
		},
		items: [{ id }, { id: id + 1 }],
	});
}

describe('deduplication across executions', () => {
	beforeAll(() => {
		process.env.WF_FALLBACK_DEDUPLICATION = 'file';
	});

	afterAll(() => {
		delete process.env.WF_FALLBACK_DEDUPLICATION;
	});

	it('removes the items of earlier runs, and starts again after the history is cleared', async () => {
		const first = await runner.run(seen(1), { step: 'Remove Duplicates', key: 'k1', execution });
		expect(first).toEqual([{ id: 1 }, { id: 2 }]);

		const second = await runner.run(seen(2), { step: 'Remove Duplicates', key: 'k2', execution });
		expect(second).toEqual([{ id: 3 }]);

		await runner.run(
			parseNodeStepArgs({
				name: 'Remove Duplicates',
				type: 'n8n-nodes-base.removeDuplicates',
				typeVersion: 2,
				parameters: { operation: 'clearDeduplicationHistory', mode: 'cleanDatabase', options: {} },
				items: [{}],
			}),
			{ step: 'Remove Duplicates', key: 'k3', execution },
		);

		const third = await runner.run(seen(2), { step: 'Remove Duplicates', key: 'k4', execution });
		expect(third).toEqual([{ id: 2 }, { id: 3 }]);
	});
});
