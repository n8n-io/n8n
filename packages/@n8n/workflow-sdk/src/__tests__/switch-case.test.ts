import { switchCase, isSwitchCaseNamedSyntax } from '../switch-case';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { fanOut } from '../fan-out';

describe('Switch Case', () => {
	describe('switchCase() array syntax (existing)', () => {
		it('should create a switch case composite with array of cases', () => {
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Case 0' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Case 1' },
			});

			const sc = switchCase([case0, case1]);
			expect(sc.switchNode).toBeDefined();
			expect(sc.cases).toHaveLength(2);
		});
	});

	describe('switchCase() named object syntax', () => {
		it('should support switchCase(node, { case0, case1, ... }) syntax', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			});
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 0' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 1' },
			});
			const case2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 2' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Downstream' },
			});

			// Named syntax: switchCase(switchNode, { case0, case1, case2 })
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					switchCase(switchNode, {
						case0,
						case1,
						case2,
					}),
				)
				.then(downstream);

			const json = wf.toJSON();

			// Should have: trigger, switch, case0, case1, case2, downstream
			expect(json.nodes).toHaveLength(6);

			// Switch should connect to all case nodes
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0
			expect(switchConns.main[0][0].node).toBe('Case 0');
			// case1 at output 1
			expect(switchConns.main[1][0].node).toBe('Case 1');
			// case2 at output 2
			expect(switchConns.main[2][0].node).toBe('Case 2');
		});

		it('should support null for empty cases', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			});
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 0' },
			});
			const case2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 2' },
			});

			// Named syntax with null for case1
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					switchCase(switchNode, {
						case0,
						case1: null, // no output 1 connection
						case2,
					}),
				);

			const json = wf.toJSON();

			// Should have: trigger, switch, case0, case2 (case1 is null)
			expect(json.nodes).toHaveLength(4);

			// Switch should connect to case0 and case2 only
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0
			expect(switchConns.main[0][0].node).toBe('Case 0');
			// case1 at output 1 - should be empty or undefined (null case = no connection)
			expect(switchConns.main[1] === undefined || switchConns.main[1].length === 0).toBe(true);
			// case2 at output 2
			expect(switchConns.main[2][0].node).toBe('Case 2');
		});

		it('should support fanOut() for multiple targets from one case', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
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
					switchCase(switchNode, {
						case0: fanOut(targetA, targetB), // output 0 -> both A and B
						case1: targetC, // output 1 -> C
					}),
				);

			const json = wf.toJSON();

			// Should have: trigger, switch, targetA, targetB, targetC
			expect(json.nodes).toHaveLength(5);

			// Switch should fan out from case0 to A and B
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0 - should have both targets
			expect(switchConns.main[0]).toHaveLength(2);
			const output0Targets = switchConns.main[0].map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Target A', 'Target B']);

			// case1 at output 1
			expect(switchConns.main[1][0].node).toBe('Target C');
		});

		it('should identify named syntax with isSwitchCaseNamedSyntax', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			});
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 0' },
			});

			// Named syntax
			const namedSc = switchCase(switchNode, { case0 });
			expect(isSwitchCaseNamedSyntax(namedSc)).toBe(true);

			// Array syntax
			const arraySc = switchCase([case0]);
			expect(isSwitchCaseNamedSyntax(arraySc)).toBe(false);
		});
	});
});
