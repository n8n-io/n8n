import { merge, isMergeBuilder, isMergeInputTarget } from '../merge';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { ifElse } from '../if-else';
import type { NodeInstance } from '../types/base';

describe('Merge Builder', () => {
	describe('merge() builder syntax', () => {
		it('should return a MergeBuilder when called with config', () => {
			const myMerge = merge({ name: 'Combine', parameters: { mode: 'combine' } });

			expect(isMergeBuilder(myMerge)).toBe(true);
			expect(myMerge.mergeNode.name).toBe('Combine');
		});

		it('should return a MergeBuilder with default name', () => {
			const myMerge = merge({});

			expect(isMergeBuilder(myMerge)).toBe(true);
			expect(myMerge.mergeNode.name).toBe('Merge');
		});

		it('should return MergeInputTarget from .input()', () => {
			const myMerge = merge({ name: 'Combine' });

			const input0 = myMerge.input(0);
			const input1 = myMerge.input(1);

			expect(isMergeInputTarget(input0)).toBe(true);
			expect(isMergeInputTarget(input1)).toBe(true);
			expect(input0.inputIndex).toBe(0);
			expect(input1.inputIndex).toBe(1);
			expect(input0.mergeBuilder).toBe(myMerge);
		});

		it('should cache MergeInputTarget instances', () => {
			const myMerge = merge({ name: 'Combine' });

			const input0First = myMerge.input(0);
			const input0Second = myMerge.input(0);

			expect(input0First).toBe(input0Second);
		});

		it('should allow chaining from merge via .then()', () => {
			const myMerge = merge({ name: 'Combine' });
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Downstream' },
			});

			const chain = myMerge.then(downstream);

			expect(chain.head.name).toBe('Combine');
			expect(chain.tail.name).toBe('Downstream');
		});
	});

	describe('merge builder with workflow', () => {
		it('should connect branches to merge inputs via ifElse chains', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
			const nodeA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Node A' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Node B' },
			});
			const finalNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Final' },
			});

			const myMerge = merge({ name: 'Rejoin', parameters: { mode: 'combine' } });
			const myIf = ifElse(ifNode);
			myIf.onTrue(nodeA).then(myMerge.input(0));
			myIf.onFalse(nodeB).then(myMerge.input(1));

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(myIf)
				.add(myMerge)
				.then(myMerge)
				.then(finalNode);

			const json = wf.toJSON();

			// Should have: trigger, if, nodeA, nodeB, merge, final
			expect(json.nodes).toHaveLength(6);

			// IF should connect to nodeA at output 0
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();
			expect(ifConns.main[0]![0]!.node).toBe('Node A');

			// IF should connect to nodeB at output 1
			expect(ifConns.main[1]![0]!.node).toBe('Node B');

			// nodeA should connect to Rejoin at input 0
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0]!.node).toBe('Rejoin');
			expect(nodeAConns.main[0]![0]!.index).toBe(0);

			// nodeB should connect to Rejoin at input 1
			const nodeBConns = json.connections['Node B'];
			expect(nodeBConns).toBeDefined();
			expect(nodeBConns.main[0]![0]!.node).toBe('Rejoin');
			expect(nodeBConns.main[0]![0]!.index).toBe(1);

			// Merge should connect to final
			const mergeConns = json.connections['Rejoin'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0]![0]!.node).toBe('Final');
		});

		it('should support adding merge builder via .add()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Downstream' },
			});

			const myMerge = merge({ name: 'Combine' });

			const wf = workflow('test-id', 'Test').add(t).add(myMerge).then(myMerge).then(downstream);

			const json = wf.toJSON();

			// Should have: trigger, merge, downstream
			expect(json.nodes).toHaveLength(3);

			// Merge should connect to downstream
			const mergeConns = json.connections['Combine'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0]![0]!.node).toBe('Downstream');
		});
	});
});
