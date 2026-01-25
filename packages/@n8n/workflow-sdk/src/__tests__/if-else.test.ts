import { ifElse, isIfElseBuilder } from '../if-else';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { merge } from '../merge';
import type { NodeInstance } from '../types/base';

// Helper type for IF node
type IfNode = NodeInstance<'n8n-nodes-base.if', string, unknown>;

describe('IF Else Builder', () => {
	describe('ifElse() builder syntax', () => {
		it('should return an IfElseBuilder when called with just an IF node', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;

			const builder = ifElse(ifNode);

			expect(isIfElseBuilder(builder)).toBe(true);
			expect(builder.ifNode).toBe(ifNode);
		});

		it('should allow chaining after onTrue()', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
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

			const builder = ifElse(ifNode);
			// onTrue should return a BranchChain that allows .then()
			const chain = builder.onTrue(nodeA).then(nodeB);

			// Chain should exist and be chainable
			expect(chain).toBeDefined();
		});

		it('should generate correct connections for chained branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
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
			const nodeC = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Node C' },
			});

			const myIf = ifElse(ifNode);
			myIf.onTrue(nodeA).then(nodeB); // if(0) -> nodeA -> nodeB
			myIf.onFalse(nodeC); // if(1) -> nodeC

			const wf = workflow('test-id', 'Test').add(t).then(myIf);

			const json = wf.toJSON();

			// Should have: trigger, if, nodeA, nodeB, nodeC
			expect(json.nodes).toHaveLength(5);

			// IF should connect to nodeA at output 0
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();
			expect(ifConns.main[0]![0]!.node).toBe('Node A');

			// IF should connect to nodeC at output 1
			expect(ifConns.main[1]![0]!.node).toBe('Node C');

			// nodeA should connect to nodeB
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0]!.node).toBe('Node B');
		});

		it('should allow branch chain to end at merge input', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
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
			myIf.onTrue(nodeA).then(myMerge.input(0)); // true branch ends at merge input 0
			myIf.onFalse(nodeB).then(myMerge.input(1)); // false branch ends at merge input 1

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(myIf)
				.add(myMerge)
				.then(myMerge)
				.then(finalNode);

			const json = wf.toJSON();

			// nodeA should connect to Rejoin at input 0
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0]!.node).toBe('Rejoin');
			expect(nodeAConns.main[0]![0]!.type).toBe('main');
			expect(nodeAConns.main[0]![0]!.index).toBe(0);

			// nodeB should connect to Rejoin at input 1
			const nodeBConns = json.connections['Node B'];
			expect(nodeBConns).toBeDefined();
			expect(nodeBConns.main[0]![0]!.node).toBe('Rejoin');
			expect(nodeBConns.main[0]![0]!.index).toBe(1);
		});

		it('should support arrays for fan-out in onTrue/onFalse', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
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
			const nodeC = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Node C' },
			});

			const myIf = ifElse(ifNode);
			myIf.onTrue([nodeA, nodeB]); // fan-out: if(0) -> nodeA AND nodeB
			myIf.onFalse(nodeC);

			const wf = workflow('test-id', 'Test').add(t).then(myIf);

			const json = wf.toJSON();

			// IF should fan out from true branch to A and B
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true at output 0 - should have both targets
			expect(ifConns.main[0]).toHaveLength(2);
			const output0Targets = ifConns.main[0]!.map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Node A', 'Node B']);
		});
	});
});
