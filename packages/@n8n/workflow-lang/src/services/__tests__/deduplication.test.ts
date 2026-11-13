import { runDeduplicationCall, type DeduplicationBackend } from '../deduplication.ts';

describe('runDeduplicationCall', () => {
	const calls: unknown[] = [];
	const backend: DeduplicationBackend = {
		checkProcessedAndRecord: async (...a) => {
			calls.push(['check', ...a]);
			return { new: ['b'], processed: ['a'] };
		},
		removeProcessed: async (...a) => {
			calls.push(['remove', ...a]);
		},
		clearAllProcessedItems: async (...a) => {
			calls.push(['clear', ...a]);
		},
		getProcessedDataCount: async (...a) => {
			calls.push(['count', ...a]);
			return 3;
		},
	};

	it('runs each call for the workflow of the execution', async () => {
		const event = (op: string, args: Record<string, unknown>) => ({
			service: 'deduplication',
			op,
			args,
		});
		expect(
			await runDeduplicationCall(
				backend,
				event('checkProcessedAndRecord', {
					items: ['a', 'b'],
					scope: 'node',
					node: { id: 'n1' },
					// A workflow that the args name is not used.
					workflow: { id: 'other' },
					options: { mode: 'entries', maxEntries: 10 },
				}),
				'wf1',
			),
		).toEqual({ ok: true, result: { new: ['b'], processed: ['a'] } });
		expect(
			await runDeduplicationCall(
				backend,
				event('getProcessedDataCount', { scope: 'workflow', options: { mode: 'entries' } }),
				'wf1',
			),
		).toEqual({ ok: true, result: 3 });
		expect(
			await runDeduplicationCall(
				backend,
				event('clearAllProcessedItems', { scope: 'workflow', options: {} }),
				'wf1',
			),
		).toEqual({ ok: true, result: null });
		expect(calls).toEqual([
			[
				'check',
				['a', 'b'],
				'node',
				{ workflow: { id: 'wf1' }, node: { id: 'n1' } },
				{ mode: 'entries', maxEntries: 10 },
			],
			['count', 'workflow', { workflow: { id: 'wf1' } }, { mode: 'entries' }],
			['clear', 'workflow', { workflow: { id: 'wf1' } }, {}],
		]);
	});

	it('refuses an unknown call and the scope node without a node', async () => {
		expect(
			await runDeduplicationCall(
				backend,
				{ service: 'deduplication', op: 'drop', args: {} },
				'wf1',
			),
		).toEqual({
			ok: false,
			error: { message: 'Unknown deduplication operation "drop"' },
		});
		expect(
			await runDeduplicationCall(
				backend,
				{ service: 'deduplication', op: 'getProcessedDataCount', args: { scope: 'node' } },
				'wf1',
			),
		).toEqual({ ok: false, error: { message: 'The scope "node" needs the node id' } });
	});
});
