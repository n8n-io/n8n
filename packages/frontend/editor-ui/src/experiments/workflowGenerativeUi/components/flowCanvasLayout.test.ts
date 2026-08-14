import { describe, expect, it } from 'vitest';
import type { WorkflowUiConnection } from '../workflowPayload';
import {
	buildFlowModel,
	computeFlowLayout,
	flowMinScale,
	flowNarrowWidth,
	resolveFlowViewport,
	type FlowNodeInput,
} from './flowCanvasLayout';

function connection(
	sourceNodeId: string,
	targetNodeId: string,
	overrides: Partial<WorkflowUiConnection> = {},
): WorkflowUiConnection {
	return {
		sourceNodeId,
		targetNodeId,
		type: 'main',
		outputIndex: 0,
		inputIndex: 0,
		...overrides,
	};
}

function nodeInput(key: string, nodeIds: string[], label: string | null = null): FlowNodeInput {
	return { key, nodeIds, label };
}

function placement(result: ReturnType<typeof computeFlowLayout>, key: string) {
	const found = result.placements.find((entry) => entry.key === key);
	if (!found) throw new Error(`Missing placement for ${key}`);
	return found;
}

describe('computeFlowLayout', () => {
	it('lays a sequence out in a single row with increasing columns', () => {
		const result = computeFlowLayout(
			['a', 'b', 'c'],
			[
				{ fromKey: 'a', toKey: 'b' },
				{ fromKey: 'b', toKey: 'c' },
			],
			'sequence',
		);

		expect(result.rows).toBe(1);
		expect(result.placements.map((entry) => entry.column)).toEqual([0, 1, 2]);
		expect(result.placements.every((entry) => entry.row === 0)).toBe(true);
	});

	it('stacks sibling branches in the same column on separate rows', () => {
		const result = computeFlowLayout(
			['root', 'left', 'right'],
			[
				{ fromKey: 'root', toKey: 'left' },
				{ fromKey: 'root', toKey: 'right' },
			],
			'branch',
		);

		expect(placement(result, 'root').column).toBe(0);
		expect(placement(result, 'left').column).toBe(1);
		expect(placement(result, 'right').column).toBe(1);
		expect(placement(result, 'left').row).not.toBe(placement(result, 'right').row);
	});

	it('places a hub at the origin with spokes in the next column', () => {
		const result = computeFlowLayout(
			['hub', 'a', 'b', 'c'],
			[
				{ fromKey: 'hub', toKey: 'a' },
				{ fromKey: 'hub', toKey: 'b' },
				{ fromKey: 'hub', toKey: 'c' },
			],
			'hub',
		);

		expect(placement(result, 'hub')).toEqual({ key: 'hub', column: 0, row: 0 });
		for (const spoke of ['a', 'b', 'c']) {
			expect(placement(result, spoke).column).toBe(1);
		}
		expect(result.rows).toBe(3);
	});

	it('gives each independent chain its own parallel row', () => {
		const result = computeFlowLayout(
			['a', 'b', 'c', 'd'],
			[
				{ fromKey: 'a', toKey: 'b' },
				{ fromKey: 'c', toKey: 'd' },
			],
			'parallel',
		);

		expect(result.rows).toBe(2);
		expect(placement(result, 'a').row).toBe(placement(result, 'b').row);
		expect(placement(result, 'c').row).toBe(placement(result, 'd').row);
		expect(placement(result, 'a').row).not.toBe(placement(result, 'c').row);
		expect(placement(result, 'b').column).toBe(1);
		expect(placement(result, 'd').column).toBe(1);
	});

	it('ranks a diamond by longest path in auto layout', () => {
		const result = computeFlowLayout(
			['a', 'b', 'c', 'd'],
			[
				{ fromKey: 'a', toKey: 'b' },
				{ fromKey: 'a', toKey: 'c' },
				{ fromKey: 'b', toKey: 'd' },
				{ fromKey: 'c', toKey: 'd' },
			],
			'auto',
		);

		expect(placement(result, 'a').column).toBe(0);
		expect(placement(result, 'b').column).toBe(1);
		expect(placement(result, 'c').column).toBe(1);
		expect(placement(result, 'd').column).toBe(2);
	});

	it('returns an empty layout for no nodes', () => {
		const result = computeFlowLayout([], [], 'auto');
		expect(result).toEqual({ placements: [], columns: 0, rows: 0, intent: 'auto' });
	});

	it('stays deterministic when a cycle is present', () => {
		const result = computeFlowLayout(
			['a', 'b'],
			[
				{ fromKey: 'a', toKey: 'b' },
				{ fromKey: 'b', toKey: 'a' },
			],
			'auto',
		);

		expect(result.placements).toHaveLength(2);
		expect(result.columns).toBeGreaterThan(0);
	});
});

describe('resolveFlowViewport', () => {
	it('scales content down to fit the available width', () => {
		expect(resolveFlowViewport({ availableWidth: 600, contentWidth: 800 })).toEqual({
			scale: 0.75,
			narrow: false,
		});
	});

	it('keeps content unscaled when it already fits', () => {
		expect(resolveFlowViewport({ availableWidth: 800, contentWidth: 600 })).toEqual({
			scale: 1,
			narrow: false,
		});
	});

	it('uses the linear fallback for narrow viewports', () => {
		expect(
			resolveFlowViewport({
				availableWidth: flowNarrowWidth - 1,
				contentWidth: flowNarrowWidth * 2,
			}),
		).toEqual({ scale: 1, narrow: true });
	});

	it('uses the linear fallback when fitting would go below the minimum scale', () => {
		expect(
			resolveFlowViewport({
				availableWidth: flowNarrowWidth,
				contentWidth: flowNarrowWidth / (flowMinScale - 0.1),
			}),
		).toEqual({ scale: 1, narrow: true });
	});
});

describe('buildFlowModel', () => {
	it('derives ordinary edges from real connections between rendered nodes', () => {
		const model = buildFlowModel(
			[nodeInput('n1', ['a'], 'Trigger'), nodeInput('n2', ['b'], 'Send email')],
			[connection('a', 'b')],
			[],
			'auto',
		);

		expect(model.edges).toHaveLength(1);
		expect(model.edges[0]).toMatchObject({ fromKey: 'n1', toKey: 'n2' });
	});

	it('ignores connections that reference nodes outside the canvas', () => {
		const model = buildFlowModel([nodeInput('n1', ['a'])], [connection('a', 'ghost')], [], 'auto');

		expect(model.edges).toHaveLength(0);
	});

	it('deduplicates derived edges that collapse onto the same box pair', () => {
		const model = buildFlowModel(
			[nodeInput('cluster', ['a', 'b']), nodeInput('target', ['c'])],
			[connection('a', 'c'), connection('b', 'c')],
			[],
			'auto',
		);

		expect(model.edges).toHaveLength(1);
		expect(model.edges[0]).toMatchObject({ fromKey: 'cluster', toKey: 'target' });
	});

	it('adds explicit labels only to real derived edges', () => {
		const model = buildFlowModel(
			[nodeInput('n1', ['a'], 'Check'), nodeInput('n2', ['b'], 'Notify')],
			[connection('a', 'b')],
			[{ fromNodeId: 'a', toNodeId: 'b', label: 'On failure' }],
			'auto',
		);

		expect(model.edges[0].label).toBe('On failure');
		expect(model.connectionList[0].label).toBe('On failure');
	});

	it('matches complete topology tuples before collapsing box pairs', () => {
		const model = buildFlowModel(
			[nodeInput('n1', ['a'], 'Check'), nodeInput('n2', ['b'], 'Notify')],
			[
				connection('a', 'b', { type: 'main', outputIndex: 0, inputIndex: 0 }),
				connection('a', 'b', { type: 'ai_tool', outputIndex: 1, inputIndex: 2 }),
			],
			[
				{
					fromNodeId: 'a',
					toNodeId: 'b',
					type: 'ai_tool',
					outputIndex: 1,
					inputIndex: 2,
					label: 'Tool route',
				},
			],
			'auto',
		);

		expect(model.edges).toHaveLength(1);
		expect(model.tuples.map((tuple) => tuple.label)).toEqual([null, 'Tool route']);
		expect(model.edges[0].label).toBe('Tool route');
	});

	it('never invents geometry for explicit connections without a real edge', () => {
		const model = buildFlowModel(
			[nodeInput('n1', ['a']), nodeInput('n2', ['b'])],
			[],
			[{ fromNodeId: 'a', toNodeId: 'b', label: 'Imaginary' }],
			'auto',
		);

		expect(model.edges).toHaveLength(0);
	});

	it('builds an ordered accessible connection list with readable labels', () => {
		const model = buildFlowModel(
			[
				nodeInput('n1', ['a'], 'Webhook'),
				nodeInput('n2', ['b'], 'Filter'),
				nodeInput('n3', ['c'], 'Slack'),
			],
			[connection('b', 'c'), connection('a', 'b')],
			[],
			'sequence',
		);

		expect(model.connectionList.map((entry) => `${entry.fromLabel}->${entry.toLabel}`)).toEqual([
			'Webhook->Filter',
			'Filter->Slack',
		]);
	});
});
