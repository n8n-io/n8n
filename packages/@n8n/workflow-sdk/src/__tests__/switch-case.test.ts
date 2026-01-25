import { switchCase, isSwitchCaseBuilder } from '../switch-case';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { merge } from '../merge';
import type { NodeInstance } from '../types/base';

// Helper type for Switch node
type SwitchNode = NodeInstance<'n8n-nodes-base.switch', string, unknown>;

describe('Switch Case Builder', () => {
	describe('switchCase() builder syntax', () => {
		it('should return a SwitchCaseBuilder when called with a switch node', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;

			const builder = switchCase(switchNode);

			expect(isSwitchCaseBuilder(builder)).toBe(true);
			expect(builder.switchNode).toBe(switchNode);
		});

		it('should throw if first argument is not a switch node', () => {
			const notSwitch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Not a Switch' },
			});

			expect(() => {
				// @ts-expect-error - Testing runtime rejection
				switchCase(notSwitch);
			}).toThrow('switchCase() requires a Switch node as first argument');
		});

		it('should allow chaining after onCase()', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const nodeA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Node A' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Node B' },
			});

			const builder = switchCase(switchNode);
			const chain = builder.onCase(0, nodeA).then(nodeB);

			expect(chain._isCaseChain).toBe(true);
			expect(chain.nodes).toContain(nodeA);
			expect(chain.nodes).toContain(nodeB);
		});

		it('should generate correct connections for cases', () => {
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

			const mySwitch = switchCase(switchNode);
			mySwitch.onCase(0, case0);
			mySwitch.onCase(1, case1);
			mySwitch.onCase(2, case2);

			const wf = workflow('test-id', 'Test').add(t).then(mySwitch);

			const json = wf.toJSON();

			// Should have: trigger, switch, case0, case1, case2
			expect(json.nodes).toHaveLength(5);

			// Switch should connect to all case nodes
			const switchConns = json.connections['My Switch'];
			expect(switchConns).toBeDefined();

			// case0 at output 0
			expect(switchConns.main[0]![0]!.node).toBe('Case 0');
			// case1 at output 1
			expect(switchConns.main[1]![0]!.node).toBe('Case 1');
			// case2 at output 2
			expect(switchConns.main[2]![0]!.node).toBe('Case 2');
		});

		it('should allow case chain to end at merge input', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const nodeA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Node A' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Node B' },
			});

			const myMerge = merge({ name: 'Combine' });
			const mySwitch = switchCase(switchNode);
			mySwitch.onCase(0, nodeA).then(myMerge.input(0));
			mySwitch.onCase(1, nodeB).then(myMerge.input(1));

			const wf = workflow('test-id', 'Test').add(t).then(mySwitch).add(myMerge);

			const json = wf.toJSON();

			// Should have: trigger, switch, nodeA, nodeB, merge
			expect(json.nodes).toHaveLength(5);

			// nodeA should connect to merge input 0
			const nodeAConns = json.connections['Node A'];
			expect(nodeAConns).toBeDefined();
			expect(nodeAConns.main[0]![0]!.node).toBe('Combine');
			expect(nodeAConns.main[0]![0]!.index).toBe(0);

			// nodeB should connect to merge input 1
			const nodeBConns = json.connections['Node B'];
			expect(nodeBConns).toBeDefined();
			expect(nodeBConns.main[0]![0]!.node).toBe('Combine');
			expect(nodeBConns.main[0]![0]!.index).toBe(1);
		});

		it('should support arrays for fan-out in onCase', () => {
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

			const mySwitch = switchCase(switchNode);
			mySwitch.onCase(0, [targetA, targetB]); // fan-out
			mySwitch.onCase(1, targetC);

			const wf = workflow('test-id', 'Test').add(t).then(mySwitch);

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
			expect(switchConns.main[1]![0]!.node).toBe('Target C');
		});

		it('should support chained cases with downstream connections', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'My Switch' },
			}) as SwitchNode;
			const processA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process A' },
			});
			const processB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process B' },
			});
			const finalize = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Finalize' },
			});

			const mySwitch = switchCase(switchNode);
			mySwitch.onCase(0, processA).then(processB).then(finalize);

			const wf = workflow('test-id', 'Test').add(t).then(mySwitch);

			const json = wf.toJSON();

			// Should have: trigger, switch, processA, processB, finalize
			expect(json.nodes).toHaveLength(5);

			// Switch -> processA
			const switchConns = json.connections['My Switch'];
			expect(switchConns.main[0]![0]!.node).toBe('Process A');

			// processA -> processB
			const processAConns = json.connections['Process A'];
			expect(processAConns.main[0]![0]!.node).toBe('Process B');

			// processB -> finalize
			const processBConns = json.connections['Process B'];
			expect(processBConns.main[0]![0]!.node).toBe('Finalize');
		});
	});
});
