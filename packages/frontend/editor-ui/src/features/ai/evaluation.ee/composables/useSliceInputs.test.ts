import { describe, it, expect } from 'vitest';
import type { IConnections, IRunData } from 'n8n-workflow';

import { readFirstInputItemViaGraph } from './useSliceInputs';

describe('readFirstInputItemViaGraph', () => {
	// A pre-existing Evaluation Trigger converges on the same node as the
	// workflow's real trigger. A normal (non-evaluation) execution never runs
	// the Evaluation Trigger, so its runData has no entry for it.
	const connections: IConnections = {
		'Eval Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		'Manual Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
	};
	const runData: IRunData = {
		'Manual Trigger': [
			{
				startTime: 0,
				executionIndex: 0,
				executionTime: 0,
				source: [],
				data: { main: [[{ json: { chatInput: 'hello' } }]] },
			},
		],
	};

	it('picks the real trigger over a converging Evaluation Trigger regardless of connection order', () => {
		const result = readFirstInputItemViaGraph(
			runData,
			connections,
			'Agent',
			new Set(['Eval Trigger']),
		);
		expect(result).toEqual({ chatInput: 'hello' });
	});

	it('still resolves (via the parents[0] fallback) when two non-evaluation nodes are genuinely ambiguous', () => {
		// Two real triggers both feed Agent — resolveSingleUpstream can't disambiguate,
		// so behavior falls back to picking a parent deterministically rather than
		// leaving the preview empty.
		const ambiguous: IConnections = {
			'Manual Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			'Webhook Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		};
		const bothRunData: IRunData = {
			...runData,
			'Webhook Trigger': runData['Manual Trigger'],
		};
		const result = readFirstInputItemViaGraph(bothRunData, ambiguous, 'Agent', new Set());
		expect(result).toEqual({ chatInput: 'hello' });
	});

	it('returns undefined when the node has no parents', () => {
		const result = readFirstInputItemViaGraph(runData, {}, 'Agent', new Set());
		expect(result).toBeUndefined();
	});

	it("strips Evaluation Trigger metadata fields when it is the AI node's sole parent", () => {
		// No Set node between the trigger and the AI node: the trigger's own
		// output (including its `_rowsLeft`/`row_number` metadata) is read directly.
		const evalOnlyConnections: IConnections = {
			'Eval Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		};
		const evalOnlyRunData: IRunData = {
			'Eval Trigger': [
				{
					startTime: 0,
					executionIndex: 0,
					executionTime: 0,
					source: [],
					data: {
						main: [[{ json: { ticket_text: 'help me', row_number: 1, _rowsLeft: 4 } }]],
					},
				},
			],
		};
		const result = readFirstInputItemViaGraph(
			evalOnlyRunData,
			evalOnlyConnections,
			'Agent',
			new Set(['Eval Trigger']),
		);
		expect(result).toEqual({ ticket_text: 'help me' });
	});

	it('strips Data table row bookkeeping columns (id/row_id/createdAt/updatedAt) from a Data table-sourced trigger', () => {
		// The Data table source spreads the fetched row (including its own
		// id/createdAt/updatedAt system columns) into the trigger's output.
		const evalOnlyConnections: IConnections = {
			'Eval Trigger': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		};
		const evalOnlyRunData: IRunData = {
			'Eval Trigger': [
				{
					startTime: 0,
					executionIndex: 0,
					executionTime: 0,
					source: [],
					data: {
						main: [
							[
								{
									json: {
										ticket_text: 'help me',
										id: 12,
										createdAt: '2026-01-01T00:00:00.000Z',
										updatedAt: '2026-01-01T00:00:00.000Z',
										row_number: 1,
										row_id: 12,
										_rowsLeft: 4,
									},
								},
							],
						],
					},
				},
			],
		};
		const result = readFirstInputItemViaGraph(
			evalOnlyRunData,
			evalOnlyConnections,
			'Agent',
			new Set(['Eval Trigger']),
		);
		expect(result).toEqual({ ticket_text: 'help me' });
	});
});
