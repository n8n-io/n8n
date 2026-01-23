import { ifBranch, isIfBranchNamedSyntax } from '../if-branch';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { fanOut } from '../fan-out';

describe('IF Branch', () => {
	describe('ifBranch() array syntax (existing)', () => {
		it('should create an IF branch composite with array of branches', () => {
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

			const ib = ifBranch([trueNode, falseNode]);
			expect(ib.ifNode).toBeDefined();
			expect(ib.trueBranch).toBe(trueNode);
			expect(ib.falseBranch).toBe(falseNode);
		});
	});

	describe('ifBranch() named object syntax', () => {
		it('should support ifBranch(node, { true, false }) syntax', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			});
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

			// Named syntax: ifBranch(ifNode, { true: trueBranch, false: falseBranch })
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					ifBranch(ifNode, {
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
			expect(ifConns.main[0][0].node).toBe('True Branch');
			// false branch at output 1
			expect(ifConns.main[1][0].node).toBe('False Branch');
		});

		it('should support null for empty branches', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			});
			const trueBranch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'True Branch' },
			});

			// Named syntax with null false branch
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					ifBranch(ifNode, {
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
			expect(ifConns.main[0][0].node).toBe('True Branch');
			// false branch at output 1 - should be empty or undefined
			expect(ifConns.main[1]).toBeUndefined();
		});

		it('should support fanOut() for multiple targets from one branch', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			});
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
					ifBranch(ifNode, {
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
			const output0Targets = ifConns.main[0].map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Target A', 'Target B']);

			// false at output 1
			expect(ifConns.main[1][0].node).toBe('Target C');
		});

		it('should identify named syntax with isIfBranchNamedSyntax', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'My IF' },
			});
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

			// Named syntax
			const namedIb = ifBranch(ifNode, { true: trueBranch, false: falseBranch });
			expect(isIfBranchNamedSyntax(namedIb)).toBe(true);

			// Array syntax
			const arrayIb = ifBranch([trueBranch, falseBranch]);
			expect(isIfBranchNamedSyntax(arrayIb)).toBe(false);
		});
	});
});
