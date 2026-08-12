import { parseWorkflowCode } from '../../codegen/parse-workflow-code';
import type { NodeInstance } from '../../types/base';
import { workflow } from '../../workflow-builder';
import { node, trigger, isIfElseBuilder, ifElse } from '../node-builders/node-builder';

// Helper type for IF node
type IfNode = NodeInstance<'n8n-nodes-base.if', string, unknown>;

describe('ifElse() factory function', () => {
	it('ifElse() creates an IF node with correct type', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		expect(ifN.type).toBe('n8n-nodes-base.if');
	});

	it('ifElse() uses provided version', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		expect(ifN.version).toBe('2.2');
	});

	it('ifElse() supports .onTrue() and .onFalse()', () => {
		const ifN = ifElse({ version: 2.2, config: { name: 'My IF' } });
		const trueBranch = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });
		const falseBranch = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });

		// Use non-null assertion since onTrue is only guaranteed on IF nodes
		const builder = ifN.onTrue!(trueBranch).onFalse(falseBranch);
		expect(isIfElseBuilder(builder)).toBe(true);
	});
});

describe('parseWorkflowCode with ifElse', () => {
	it('parseWorkflowCode recognizes ifElse()', () => {
		const code = `
export default workflow('test', 'Test')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }))
  .to(ifElse({ version: 2.2, config: { name: 'Check' } }).onTrue(node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} })).onFalse(null));
`;
		expect(() => parseWorkflowCode(code)).not.toThrow();
	});
});

describe('IF Else fluent API', () => {
	describe('ifNode.onTrue().onFalse() syntax', () => {
		it('should require an IF node for onTrue()', () => {
			const regularNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Node' },
			});
			const target = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Target' },
			});

			// onTrue() should throw on non-IF nodes
			expect(() => {
				(regularNode as unknown as IfNode).onTrue!(target);
			}).toThrow('.onTrue() is only available on IF nodes');
		});

		it('should require an IF node for onFalse()', () => {
			const regularNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set Node' },
			});
			const target = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Target' },
			});

			// onFalse() should throw on non-IF nodes
			expect(() => {
				(regularNode as unknown as IfNode).onFalse!(target);
			}).toThrow('.onFalse() is only available on IF nodes');
		});

		it('should work with fluent syntax: ifNode.onTrue!(trueBranch).onFalse(falseBranch)', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			// Fluent syntax should work
			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
			expect(builder.ifNode).toBe(ifNode);
		});

		it('should return an IfElseBuilder', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
		});
	});

	describe('fluent API in workflow', () => {
		it('should support ifNode.onTrue!(trueBranch).onFalse(falseBranch) in workflow', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Downstream' },
			});

			// Fluent syntax in workflow
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueBranch).onFalse(falseBranch))
				.to(downstream);

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch, falseBranch, downstream
			expect(json.nodes).toHaveLength(5);

			// IF should connect to both branches
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0].node).toBe('True Branch');
			// false branch at output 1
			expect(ifConns.main[1]![0].node).toBe('False Branch');
		});

		it('should support null for empty branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});

			// Fluent syntax with only true branch (no false)
			const wf = workflow('test-id', 'Test').add(t).to(ifNode.onTrue!(trueBranch));

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch
			expect(json.nodes).toHaveLength(3);

			// IF should only connect to true branch
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0].node).toBe('True Branch');
			// false branch at output 1 - should be empty or undefined
			expect(ifConns.main[1]).toBeUndefined();
		});

		it('should support plain array for multiple targets from one branch', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const targetA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target A' },
			});
			const targetB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target B' },
			});
			const targetC = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Target C' },
			});

			// Fluent syntax with plain array for fan-out
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!([targetA, targetB]).onFalse(targetC));

			const json = wf.toJSON();

			// Should have: trigger, if, targetA, targetB, targetC
			expect(json.nodes).toHaveLength(5);

			// IF should fan out from true branch to A and B
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true at output 0 - should have both targets
			expect(ifConns.main[0]).toHaveLength(2);
			const output0Targets = ifConns.main[0]!.map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Target A', 'Target B']);

			// false at output 1
			expect(ifConns.main[1]![0].node).toBe('Target C');
		});

		it('should identify builder with isIfElseBuilder', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			// Fluent syntax
			const builder = ifNode.onTrue!(trueBranch).onFalse(falseBranch);
			expect(isIfElseBuilder(builder)).toBe(true);
		});

		it('should support chain passed to onTrue with internal connections', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const nodeA = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Node A' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Node B' },
			});

			// Create chain: nodeA.to(nodeB)
			const chain = nodeA.to(nodeB);

			// Fluent syntax with chain in onTrue
			const wf = workflow('test-id', 'Test').add(t).to(ifNode.onTrue!(chain));

			const json = wf.toJSON();

			// Should have: trigger, if, nodeA, nodeB
			expect(json.nodes).toHaveLength(4);

			// IF should connect to chain head (Node A)
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();
			expect(ifConns.main[0]![0].node).toBe('Node A');

			// Chain internal connection: Node A -> Node B
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0].node).toBe('Node B');
		});

		it('should handle duplicate node names in true/false branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const falseBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueBranch).onFalse(falseBranch));

			const json = wf.toJSON();

			// Should have: trigger, if, Process, Process 1
			expect(json.nodes).toHaveLength(4);

			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0 — one should be "Process"
			const trueTarget = ifConns.main[0]![0].node;
			// false branch at output 1 — the other should be "Process 1" (deduped)
			const falseTarget = ifConns.main[1]![0].node;

			// Both must be connected (not pointing to the same name)
			expect(new Set([trueTarget, falseTarget]).size).toBe(2);
			expect([trueTarget, falseTarget].sort()).toEqual(['Process', 'Process 1']);
		});

		it('should handle duplicate-named chains in true/false branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;

			const trueHead = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Fetch' },
			});
			const trueTail = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Save' },
			});
			const trueChain = trueHead.to(trueTail);

			const falseHead = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Fetch' },
			});
			const falseTail = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Save' },
			});
			const falseChain = falseHead.to(falseTail);

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(trueChain).onFalse(falseChain));

			const json = wf.toJSON();

			// Should have: trigger, if, Fetch, Save, Fetch 1, Save 1
			expect(json.nodes).toHaveLength(6);

			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			const trueTarget = ifConns.main[0]![0].node;
			const falseTarget = ifConns.main[1]![0].node;

			// Both branches should point to different nodes
			expect(trueTarget).not.toBe(falseTarget);
			expect([trueTarget, falseTarget].sort()).toEqual(['Fetch', 'Fetch 1']);
		});
	});
});
