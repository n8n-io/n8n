import { detectStickyLayoutWarnings } from './sticky-layout-warnings';
import type { WorkflowJSON } from '../types/base';

const STICKY = 'n8n-nodes-base.stickyNote';

function stickyNode(
	name: string,
	position: [number, number],
	width: number,
	height: number,
	content = '## ' + name,
): WorkflowJSON['nodes'][number] {
	return {
		id: name,
		name,
		type: STICKY,
		typeVersion: 1,
		position,
		parameters: { content, width, height },
	};
}

function normalNode(name: string, position: [number, number]): WorkflowJSON['nodes'][number] {
	return {
		id: name,
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3,
		position,
		parameters: {},
	};
}

function makeWorkflow(nodes: WorkflowJSON['nodes']): WorkflowJSON {
	return { id: 'w', name: 'w', nodes, connections: {} };
}

describe('detectStickyLayoutWarnings', () => {
	it('returns no warnings when stickies do not overlap', () => {
		const wf = makeWorkflow([
			stickyNode('A', [0, 0], 200, 200),
			stickyNode('B', [400, 0], 200, 200),
		]);
		expect(detectStickyLayoutWarnings(wf)).toEqual([]);
	});

	it('ignores adjacencies smaller than one grid step', () => {
		// 8px overlap in both axes — under the 16px threshold
		const wf = makeWorkflow([
			stickyNode('A', [0, 0], 200, 200),
			stickyNode('B', [192, 192], 200, 200),
		]);
		expect(detectStickyLayoutWarnings(wf)).toEqual([]);
	});

	it('flags a clear sticky-on-sticky overlap', () => {
		const wf = makeWorkflow([
			stickyNode('A', [0, 0], 240, 200),
			stickyNode('B', [200, 100], 240, 200),
		]);
		const warnings = detectStickyLayoutWarnings(wf);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('STICKY_OVERLAP');
		expect(warnings[0].message).toContain("'A'");
		expect(warnings[0].message).toContain("'B'");
		expect(warnings[0].message).toContain('40x100px');
	});

	it('classifies overlap as STICKY_WRAPS_SHARED_NODE when both stickies contain the same node', () => {
		const wf = makeWorkflow([
			stickyNode('Group', [0, 0], 400, 300),
			stickyNode('Doc', [50, 50], 200, 200),
			normalNode('Inside', [100, 100]),
		]);
		const warnings = detectStickyLayoutWarnings(wf);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('STICKY_WRAPS_SHARED_NODE');
		expect(warnings[0].message).toContain("'Inside'");
	});

	it('falls back to default dimensions when parameters.width/height are missing', () => {
		const wf = makeWorkflow([
			{
				id: 'A',
				name: 'A',
				type: STICKY,
				typeVersion: 1,
				position: [0, 0],
				parameters: { content: '## A' },
			},
			{
				id: 'B',
				name: 'B',
				type: STICKY,
				typeVersion: 1,
				position: [50, 50],
				parameters: { content: '## B' },
			},
		]);
		// Both use 240x160 defaults — they overlap heavily.
		const warnings = detectStickyLayoutWarnings(wf);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('STICKY_OVERLAP');
	});

	it('does not flag non-sticky nodes', () => {
		const wf = makeWorkflow([normalNode('A', [0, 0]), normalNode('B', [50, 50])]);
		expect(detectStickyLayoutWarnings(wf)).toEqual([]);
	});
});
