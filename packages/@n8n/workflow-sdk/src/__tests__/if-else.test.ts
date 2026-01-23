import { ifElse, isIfElseNamedSyntax } from '../if-else';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { fanOut } from '../fan-out';
import type { NodeInstance, IfElseBuilder, IfElseComposite } from '../types/base';

// Helper type for IF node
type IfNode = NodeInstance<'n8n-nodes-base.if', string, unknown>;

describe('IF Else', () => {
	describe('ifElse() requires named syntax only', () => {
		it('should require an IF node as first argument', () => {
			const trueNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Branch' },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Branch' },
			});

			// Array syntax should throw an error - named syntax is required
			expect(() => {
				// @ts-expect-error - Testing runtime rejection of array syntax
				ifElse([trueNode, falseNode]);
			}).toThrow('ifElse() requires an IF node as first argument');
		});

		it('should require named inputs { true, false } as second argument', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			});
			const trueNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'True Branch' },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'False Branch' },
			});

			// Passing array as second argument should throw
			expect(() => {
				// @ts-expect-error - Testing runtime rejection of array syntax
				ifElse([trueNode, falseNode], ifNode);
			}).toThrow('ifElse() requires an IF node as first argument');
		});

		it('should work with named syntax: ifElse(ifNode, { true, false })', () => {
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

			// Named syntax should work
			const composite = ifElse(ifNode, { true: trueBranch, false: falseBranch });
			expect(composite.ifNode).toBe(ifNode);
			expect(isIfElseNamedSyntax(composite)).toBe(true);
		});

		it('should always return named syntax composites', () => {
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

			const composite = ifElse(ifNode, { true: trueBranch, false: falseBranch });
			// All composites should now be named syntax
			expect(isIfElseNamedSyntax(composite)).toBe(true);
		});
	});

	describe('ifElse() named object syntax', () => {
		it('should support ifElse(node, { true, false }) syntax', () => {
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

			// Named syntax: ifElse(ifNode, { true: trueBranch, false: falseBranch })
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					ifElse(ifNode, {
						true: trueBranch,
						false: falseBranch,
					}),
				)
				.then(downstream);

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch, falseBranch, downstream
			expect(json.nodes).toHaveLength(5);

			// IF should connect to both branches
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0]!.node).toBe('True Branch');
			// false branch at output 1
			expect(ifConns.main[1]![0]!.node).toBe('False Branch');
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

			// Named syntax with null false branch
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					ifElse(ifNode, {
						true: trueBranch,
						false: null, // no false branch
					}),
				);

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch
			expect(json.nodes).toHaveLength(3);

			// IF should only connect to true branch
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0]!.node).toBe('True Branch');
			// false branch at output 1 - should be empty or undefined
			expect(ifConns.main[1]).toBeUndefined();
		});

		it('should support fanOut() for multiple targets from one branch', () => {
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

			// Named syntax with fanOut
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					ifElse(ifNode, {
						true: fanOut(targetA, targetB), // true -> both A and B
						false: targetC, // false -> C
					}),
				);

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
			expect(ifConns.main[1]![0]!.node).toBe('Target C');
		});

		it('should identify named syntax with isIfElseNamedSyntax', () => {
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

			// Named syntax - all ifElse composites are now named syntax
			const composite = ifElse(ifNode, { true: trueBranch, false: falseBranch });
			expect(isIfElseNamedSyntax(composite)).toBe(true);
		});
	});

	describe('ifElse() fluent builder API', () => {
		it('should return a builder when called without inputs', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;

			// Calling without inputs should return a builder
			const builder = ifElse(ifNode) as IfElseBuilder;
			expect(builder.ifNode).toBe(ifNode);
			expect(typeof builder.onTrue).toBe('function');
		});

		it('should support fluent API: ifElse(ifNode).onTrue(target).onFalse(target)', () => {
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

			// Fluent builder API
			const composite = ifElse(ifNode).onTrue(trueBranch).onFalse(falseBranch) as IfElseComposite;
			expect(composite.ifNode).toBe(ifNode);
			expect(isIfElseNamedSyntax(composite)).toBe(true);
		});

		it('should work in workflow with fluent builder API', () => {
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

			// Use fluent API in workflow
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(ifElse(ifNode).onTrue(trueBranch).onFalse(falseBranch));

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch, falseBranch
			expect(json.nodes).toHaveLength(4);

			// IF should connect to both branches
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0]!.node).toBe('True Branch');
			// false branch at output 1
			expect(ifConns.main[1]![0]!.node).toBe('False Branch');
		});

		it('should support null branches with fluent API', () => {
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

			// Fluent API with null false branch
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(ifElse(ifNode).onTrue(trueBranch).onFalse(null));

			const json = wf.toJSON();

			// Should have: trigger, if, trueBranch
			expect(json.nodes).toHaveLength(3);

			// IF should only connect to true branch
			const ifConns = json.connections['My IF'];
			expect(ifConns).toBeDefined();

			// true branch at output 0
			expect(ifConns.main[0]![0]!.node).toBe('True Branch');
			// false branch at output 1 - should be empty or undefined
			expect(ifConns.main[1]).toBeUndefined();
		});

		it('should support chained nodes in branches with fluent API', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const formatData = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Format Data' },
			});
			const sendReport = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Send Report' },
			});
			const logError = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Log Error' },
			});

			// Fluent API with chained nodes
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(ifElse(ifNode).onTrue(formatData.then(sendReport)).onFalse(logError));

			const json = wf.toJSON();

			// Should have: trigger, if, formatData, sendReport, logError
			expect(json.nodes).toHaveLength(5);

			// IF -> Format Data at output 0
			const ifConns = json.connections['My IF'];
			expect(ifConns.main[0]![0]!.node).toBe('Format Data');

			// Format Data -> Send Report
			const formatConns = json.connections['Format Data'];
			expect(formatConns.main[0]![0]!.node).toBe('Send Report');

			// IF -> Log Error at output 1
			expect(ifConns.main[1]![0]!.node).toBe('Log Error');
		});

		it('should support fanOut with fluent API', () => {
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

			// Fluent API with fanOut
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(ifElse(ifNode).onTrue(fanOut(targetA, targetB)).onFalse(targetC));

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
			expect(ifConns.main[1]![0]!.node).toBe('Target C');
		});

		it('should produce equivalent results for both syntaxes', () => {
			const ifNode1 = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const ifNode2 = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			}) as IfNode;
			const trueBranch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const trueBranch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});
			const falseBranch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});
			const falseBranch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'False Branch' },
			});

			// Object syntax
			const composite1 = ifElse(ifNode1, {
				true: trueBranch1,
				false: falseBranch1,
			}) as IfElseComposite;

			// Fluent builder API
			const composite2 = ifElse(ifNode2)
				.onTrue(trueBranch2)
				.onFalse(falseBranch2) as IfElseComposite;

			// Both should be named syntax
			expect(isIfElseNamedSyntax(composite1)).toBe(true);
			expect(isIfElseNamedSyntax(composite2)).toBe(true);

			// Both should have their respective IF nodes
			expect(composite1.ifNode).toBe(ifNode1);
			expect(composite2.ifNode).toBe(ifNode2);
		});
	});
});
