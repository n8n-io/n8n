import type { NodeInstance } from '../../types/base';
import { workflow } from '../../workflow-builder';
import { node, trigger, isSwitchCaseBuilder } from '../node-builders/node-builder';

// Helper type for Switch node
type SwitchNode = NodeInstance<'n8n-nodes-base.switch', string, unknown>;

describe('Switch Case fluent API', () => {
	describe('switchNode.onCase() syntax', () => {
		it('should require a switch node for onCase()', () => {
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

			// onCase() should throw on non-Switch nodes
			expect(() => {
				(regularNode as unknown as SwitchNode).onCase!(0, target);
			}).toThrow('.onCase() is only available on Switch nodes');
		});

		it('should work with fluent syntax: switchNode.onCase!(0, case0).onCase(1, case1)', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
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

			// Fluent syntax should work
			const builder = switchNode.onCase!(0, case0).onCase(1, case1);
			expect(isSwitchCaseBuilder(builder)).toBe(true);
			expect(builder.switchNode).toBe(switchNode);
		});

		it('should return a SwitchCaseBuilder', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 0' },
			});

			const builder = switchNode.onCase!(0, case0);
			expect(isSwitchCaseBuilder(builder)).toBe(true);
		});
	});

	describe('fluent API in workflow', () => {
		it('should support switchNode.onCase!(0, case0).onCase(1, case1) in workflow', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
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

			// Fluent syntax in workflow
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, case0).onCase(1, case1).onCase(2, case2))
				.to(downstream);

			const json = wf.toJSON();

			// Should have: trigger, switch, case0, case1, case2, downstream
			expect(json.nodes).toHaveLength(6);

			// Switch should connect to all case nodes
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0
			expect(switchConns.main[0]![0].node).toBe('Case 0');
			// case1 at output 1
			expect(switchConns.main[1]![0].node).toBe('Case 1');
			// case2 at output 2
			expect(switchConns.main[2]![0].node).toBe('Case 2');
		});

		it('should support sparse cases (skipping indices)', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
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

			// Fluent syntax with sparse cases (skip case1)
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, case0).onCase(2, case2));

			const json = wf.toJSON();

			// Should have: trigger, switch, case0, case2 (case1 is skipped)
			expect(json.nodes).toHaveLength(4);

			// Switch should connect to case0 and case2 only
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0
			expect(switchConns.main[0]![0].node).toBe('Case 0');
			// case1 at output 1 - should be empty or undefined (skipped)
			expect(switchConns.main[1] === undefined || switchConns.main[1]!.length === 0).toBe(true);
			// case2 at output 2
			expect(switchConns.main[2]![0].node).toBe('Case 2');
		});

		it('should support plain array for multiple targets from one case', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
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
				.to(switchNode.onCase!(0, [targetA, targetB]).onCase(1, targetC));

			const json = wf.toJSON();

			// Should have: trigger, switch, targetA, targetB, targetC
			expect(json.nodes).toHaveLength(5);

			// Switch should fan out from case0 to A and B
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0 - should have both targets
			expect(switchConns.main[0]).toHaveLength(2);
			const output0Targets = switchConns.main[0]!.map((c: { node: string }) => c.node).sort();
			expect(output0Targets).toEqual(['Target A', 'Target B']);

			// case1 at output 1
			expect(switchConns.main[1]![0].node).toBe('Target C');
		});

		it('should identify builder with isSwitchCaseBuilder', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Case 0' },
			});

			// Fluent syntax
			const builder = switchNode.onCase!(0, case0);
			expect(isSwitchCaseBuilder(builder)).toBe(true);
		});

		it('should handle duplicate node names in different cases', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, case0).onCase(1, case1));

			const json = wf.toJSON();

			// Should have: trigger, switch, Process, Process 1
			expect(json.nodes).toHaveLength(4);

			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			const target0 = switchConns.main[0]![0].node;
			const target1 = switchConns.main[1]![0].node;

			// Both must be connected to different nodes
			expect(new Set([target0, target1]).size).toBe(2);
			expect([target0, target1].sort()).toEqual(['Process', 'Process 1']);
		});

		it('should handle 3 cases with same-named nodes', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handler' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handler' },
			});
			const case2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handler' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, case0).onCase(1, case1).onCase(2, case2));

			const json = wf.toJSON();

			// Should have: trigger, switch, Handler, Handler 1, Handler 2
			expect(json.nodes).toHaveLength(5);

			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			const target0 = switchConns.main[0]![0].node;
			const target1 = switchConns.main[1]![0].node;
			const target2 = switchConns.main[2]![0].node;

			// All three must point to distinct nodes
			expect(new Set([target0, target1, target2]).size).toBe(3);
			expect([target0, target1, target2].sort()).toEqual(['Handler', 'Handler 1', 'Handler 2']);
		});
	});
});
