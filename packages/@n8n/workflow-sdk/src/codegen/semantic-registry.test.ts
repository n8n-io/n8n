import { describe, it, expect } from '@jest/globals';

import {
	getOutputName,
	getInputName,
	getCompositeType,
	getNodeSemantics,
	isCycleOutput,
} from './semantic-registry';
import type { NodeJSON } from '../types/base';

// Helper to create minimal NodeJSON for testing
function createNodeJSON(overrides: Partial<NodeJSON> = {}): NodeJSON {
	return {
		id: 'test-id',
		name: 'Test Node',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	};
}

describe('semantic-registry', () => {
	describe('getOutputName', () => {
		it('returns trueBranch for IF node output 0', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.if' });
			expect(getOutputName(node.type, 0, node)).toBe('trueBranch');
		});

		it('returns falseBranch for IF node output 1', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.if' });
			expect(getOutputName(node.type, 1, node)).toBe('falseBranch');
		});

		it('returns done for SplitInBatches output 0', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.splitInBatches' });
			expect(getOutputName(node.type, 0, node)).toBe('done');
		});

		it('returns loop for SplitInBatches output 1', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.splitInBatches' });
			expect(getOutputName(node.type, 1, node)).toBe('loop');
		});

		it('returns case0, case1, etc for Switch node outputs', () => {
			const node = createNodeJSON({
				type: 'n8n-nodes-base.switch',
				parameters: {
					rules: { rules: [{}, {}, {}] }, // 3 rules
				},
			});
			expect(getOutputName(node.type, 0, node)).toBe('case0');
			expect(getOutputName(node.type, 1, node)).toBe('case1');
			expect(getOutputName(node.type, 2, node)).toBe('case2');
			expect(getOutputName(node.type, 3, node)).toBe('fallback');
		});

		it('returns generic output name for unknown node types', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.unknown' });
			expect(getOutputName(node.type, 0, node)).toBe('output0');
			expect(getOutputName(node.type, 1, node)).toBe('output1');
		});

		it('returns generic output name for out-of-range indices', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.if' });
			// IF only has 2 outputs (0 and 1)
			expect(getOutputName(node.type, 5, node)).toBe('output5');
		});
	});

	describe('getInputName', () => {
		it('returns branch0, branch1, etc for Merge node inputs', () => {
			const node = createNodeJSON({
				type: 'n8n-nodes-base.merge',
				parameters: { numberInputs: 3 },
			});
			expect(getInputName(node.type, 0, node)).toBe('branch0');
			expect(getInputName(node.type, 1, node)).toBe('branch1');
			expect(getInputName(node.type, 2, node)).toBe('branch2');
		});

		it('defaults to 2 inputs for Merge without numberInputs parameter', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.merge' });
			expect(getInputName(node.type, 0, node)).toBe('branch0');
			expect(getInputName(node.type, 1, node)).toBe('branch1');
		});

		it('returns input for single-input nodes', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.if' });
			expect(getInputName(node.type, 0, node)).toBe('input');
		});

		it('returns generic input name for unknown node types', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.unknown' });
			expect(getInputName(node.type, 0, node)).toBe('input0');
			expect(getInputName(node.type, 1, node)).toBe('input1');
		});
	});

	describe('getCompositeType', () => {
		it('returns ifElse for IF node', () => {
			expect(getCompositeType('n8n-nodes-base.if')).toBe('ifElse');
		});

		it('returns switchCase for Switch node', () => {
			expect(getCompositeType('n8n-nodes-base.switch')).toBe('switchCase');
		});

		it('returns merge for Merge node', () => {
			expect(getCompositeType('n8n-nodes-base.merge')).toBe('merge');
		});

		it('returns splitInBatches for SplitInBatches node', () => {
			expect(getCompositeType('n8n-nodes-base.splitInBatches')).toBe('splitInBatches');
		});

		it('returns undefined for regular nodes', () => {
			expect(getCompositeType('n8n-nodes-base.noOp')).toBeUndefined();
			expect(getCompositeType('n8n-nodes-base.httpRequest')).toBeUndefined();
		});
	});

	describe('getNodeSemantics', () => {
		it('returns full semantics for IF node', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.if' });
			const semantics = getNodeSemantics(node.type, node);

			expect(semantics).toBeDefined();
			expect(semantics?.outputs).toEqual(['trueBranch', 'falseBranch']);
			expect(semantics?.inputs).toEqual(['input']);
			expect(semantics?.composite).toBe('ifElse');
		});

		it('returns full semantics for SplitInBatches node', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.splitInBatches' });
			const semantics = getNodeSemantics(node.type, node);

			expect(semantics).toBeDefined();
			expect(semantics?.outputs).toEqual(['done', 'loop']);
			expect(semantics?.cycleOutput).toBe('loop');
			expect(semantics?.composite).toBe('splitInBatches');
		});

		it('returns undefined for unknown node types', () => {
			const node = createNodeJSON({ type: 'n8n-nodes-base.unknown' });
			expect(getNodeSemantics(node.type, node)).toBeUndefined();
		});
	});

	describe('isCycleOutput', () => {
		it('returns true for SplitInBatches loop output', () => {
			expect(isCycleOutput('n8n-nodes-base.splitInBatches', 'loop')).toBe(true);
		});

		it('returns false for SplitInBatches done output', () => {
			expect(isCycleOutput('n8n-nodes-base.splitInBatches', 'done')).toBe(false);
		});

		it('returns false for IF node outputs', () => {
			expect(isCycleOutput('n8n-nodes-base.if', 'trueBranch')).toBe(false);
			expect(isCycleOutput('n8n-nodes-base.if', 'falseBranch')).toBe(false);
		});

		it('returns false for unknown node types', () => {
			expect(isCycleOutput('n8n-nodes-base.unknown', 'output0')).toBe(false);
		});
	});
});
