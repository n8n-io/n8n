import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	findMainTriggerName,
	findFirstProcessingNodeName,
	findTerminalNodeNames,
	TERMINAL_EXCLUDED_TYPES,
} from '../graph-helpers';

type Node = { name: string; type: string };
type Conns = Record<string, Record<string, Array<Array<{ node: string }>>>>;

function wf(nodes: Node[], connections: Conns = {}): WorkflowJSON {
	return {
		name: 'Test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [i * 200, 0] as [number, number],
			parameters: {},
		})),
		connections,
	} as unknown as WorkflowJSON;
}

describe('findMainTriggerName', () => {
	it('returns the leftmost trigger node', () => {
		const w = wf([
			{ name: 'T1', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Body', type: 'n8n-nodes-base.set' },
		]);
		expect(findMainTriggerName(w)).toBe('T1');
	});

	it('ignores evaluationTrigger if a normal trigger exists', () => {
		const w = wf([
			{ name: 'EvalT', type: 'n8n-nodes-base.evaluationTrigger' },
			{ name: 'T1', type: 'n8n-nodes-base.webhook' },
			{ name: 'Body', type: 'n8n-nodes-base.set' },
		]);
		expect(findMainTriggerName(w)).toBe('T1');
	});

	it('returns null if no trigger is found', () => {
		const w = wf([{ name: 'Body', type: 'n8n-nodes-base.set' }]);
		expect(findMainTriggerName(w)).toBeNull();
	});
});

describe('findFirstProcessingNodeName', () => {
	it('returns the first node connected via main[0] from the trigger', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'A', type: 'n8n-nodes-base.set' },
			],
			{ T: { main: [[{ node: 'A' }]] } },
		);
		expect(findFirstProcessingNodeName(w, 'T')).toBe('A');
	});

	it('returns null if trigger has no outgoing main connections', () => {
		const w = wf([{ name: 'T', type: 'n8n-nodes-base.manualTrigger' }]);
		expect(findFirstProcessingNodeName(w, 'T')).toBeNull();
	});
});

describe('findTerminalNodeNames', () => {
	it('returns the sole terminal for a linear workflow', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'A', type: 'n8n-nodes-base.set' },
				{ name: 'B', type: 'n8n-nodes-base.set' },
			],
			{
				T: { main: [[{ node: 'A' }]] },
				A: { main: [[{ node: 'B' }]] },
			},
		);
		expect(findTerminalNodeNames(w, 'T')).toEqual(['B']);
	});

	it('returns a single terminal when branches merge', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'IF', type: 'n8n-nodes-base.if' },
				{ name: 'A', type: 'n8n-nodes-base.set' },
				{ name: 'B', type: 'n8n-nodes-base.set' },
				{ name: 'Merge', type: 'n8n-nodes-base.merge' },
			],
			{
				T: { main: [[{ node: 'IF' }]] },
				IF: { main: [[{ node: 'A' }], [{ node: 'B' }]] },
				A: { main: [[{ node: 'Merge' }]] },
				B: { main: [[{ node: 'Merge' }]] },
			},
		);
		expect(findTerminalNodeNames(w, 'T')).toEqual(['Merge']);
	});

	it('returns multiple terminals when branches diverge', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'IF', type: 'n8n-nodes-base.if' },
				{ name: 'A', type: 'n8n-nodes-base.set' },
				{ name: 'B', type: 'n8n-nodes-base.set' },
			],
			{
				T: { main: [[{ node: 'IF' }]] },
				IF: { main: [[{ node: 'A' }], [{ node: 'B' }]] },
			},
		);
		expect(findTerminalNodeNames(w, 'T').sort()).toEqual(['A', 'B']);
	});

	it('excludes stopAndError and noOp terminals', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'IF', type: 'n8n-nodes-base.if' },
				{ name: 'Ok', type: 'n8n-nodes-base.set' },
				{ name: 'Err', type: 'n8n-nodes-base.stopAndError' },
			],
			{
				T: { main: [[{ node: 'IF' }]] },
				IF: { main: [[{ node: 'Ok' }], [{ node: 'Err' }]] },
			},
		);
		expect(findTerminalNodeNames(w, 'T')).toEqual(['Ok']);
	});

	it('returns empty array if all terminals are excluded', () => {
		const w = wf(
			[
				{ name: 'T', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Err', type: 'n8n-nodes-base.stopAndError' },
			],
			{ T: { main: [[{ node: 'Err' }]] } },
		);
		expect(findTerminalNodeNames(w, 'T')).toEqual([]);
	});

	it('exposes the list of excluded terminal types', () => {
		expect(TERMINAL_EXCLUDED_TYPES.has('n8n-nodes-base.stopAndError')).toBe(true);
		expect(TERMINAL_EXCLUDED_TYPES.has('n8n-nodes-base.noOp')).toBe(true);
	});
});
