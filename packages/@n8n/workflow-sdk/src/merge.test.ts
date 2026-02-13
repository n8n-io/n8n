import type { NodeInstance } from './types/base';
import { workflow } from './workflow-builder';
import { node, trigger } from './workflow-builder/node-builders/node-builder';

// Helper type for Merge node
type MergeNode = NodeInstance<'n8n-nodes-base.merge', string, unknown>;

describe('Merge', () => {
	describe('.input(n) syntax for merge connections', () => {
		it('should connect node to specific input index of merge node', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			}) as MergeNode;

			// .input(n) returns an InputTarget
			const inputTarget = mergeNode.input(0);
			expect(inputTarget._isInputTarget).toBe(true);
			expect(inputTarget.node).toBe(mergeNode);
			expect(inputTarget.inputIndex).toBe(0);
		});

		it('should allow different input indices', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			}) as MergeNode;

			const input0 = mergeNode.input(0);
			const input1 = mergeNode.input(1);
			const input2 = mergeNode.input(2);

			expect(input0.inputIndex).toBe(0);
			expect(input1.inputIndex).toBe(1);
			expect(input2.inputIndex).toBe(2);
		});
	});

	describe('merge workflow patterns', () => {
		it('should connect sources to different merge inputs using .input(n)', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			}) as MergeNode;
			const source1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source 1' },
			});
			const source2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source 2' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Downstream' },
			});

			// New syntax: use .input(n) to specify target input index
			const wf = workflow('test-id', 'Test')
				.add(t.to([source1, source2])) // Fan-out from trigger
				.add(source1.to(mergeNode.input(0))) // Source 1 to input 0
				.add(source2.to(mergeNode.input(1))) // Source 2 to input 1
				.add(mergeNode.to(downstream));

			const json = wf.toJSON();

			// Should have: trigger, source1, source2, merge, downstream
			expect(json.nodes).toHaveLength(5);

			// Trigger should fan-out to both source nodes
			const triggerConns = json.connections['Manual Trigger'];
			expect(triggerConns).toBeDefined();
			const triggerTargets = triggerConns.main[0]!.map((c: { node: string }) => c.node).sort();
			expect(triggerTargets).toEqual(['Source 1', 'Source 2']);

			// Source 1 should connect to Merge input 0
			const source1Conns = json.connections['Source 1'];
			expect(source1Conns).toBeDefined();
			expect(source1Conns.main[0]![0].node).toBe('My Merge');
			expect(source1Conns.main[0]![0].index).toBe(0);

			// Source 2 should connect to Merge input 1
			const source2Conns = json.connections['Source 2'];
			expect(source2Conns).toBeDefined();
			expect(source2Conns.main[0]![0].node).toBe('My Merge');
			expect(source2Conns.main[0]![0].index).toBe(1);

			// Merge should connect to downstream
			const mergeConns = json.connections['My Merge'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0]![0].node).toBe('Downstream');
		});

		it('should support multiple sources to same input index', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			}) as MergeNode;
			const sourceA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source A' },
			});
			const sourceB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source B' },
			});
			const sourceC = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source C' },
			});

			// Multiple sources to same input index (replaces fanIn)
			const wf = workflow('test-id', 'Test')
				.add(t.to([sourceA, sourceB, sourceC]))
				.add(sourceA.to(mergeNode.input(0))) // A goes to input 0
				.add(sourceB.to(mergeNode.input(0))) // B also goes to input 0
				.add(sourceC.to(mergeNode.input(1))); // C goes to input 1

			const json = wf.toJSON();

			// Should have: trigger, sourceA, sourceB, sourceC, merge
			expect(json.nodes).toHaveLength(5);

			// Source A should connect to Merge input 0
			const sourceAConns = json.connections['Source A'];
			expect(sourceAConns).toBeDefined();
			expect(sourceAConns.main[0]![0].node).toBe('My Merge');
			expect(sourceAConns.main[0]![0].index).toBe(0);

			// Source B should also connect to Merge input 0
			const sourceBConns = json.connections['Source B'];
			expect(sourceBConns).toBeDefined();
			expect(sourceBConns.main[0]![0].node).toBe('My Merge');
			expect(sourceBConns.main[0]![0].index).toBe(0);

			// Source C should connect to Merge input 1
			const sourceCConns = json.connections['Source C'];
			expect(sourceCConns).toBeDefined();
			expect(sourceCConns.main[0]![0].node).toBe('My Merge');
			expect(sourceCConns.main[0]![0].index).toBe(1);
		});

		it('should work with chains connecting to merge inputs', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Combine' },
			}) as MergeNode;
			const process1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process 1' },
			});
			const transform1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Transform 1' },
			});
			const process2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process 2' },
			});

			// Chains ending at merge inputs
			const wf = workflow('test-id', 'Test')
				.add(t.to([process1, process2]))
				.add(process1.to(transform1).to(mergeNode.input(0))) // Chain to input 0
				.add(process2.to(mergeNode.input(1))); // Direct to input 1

			const json = wf.toJSON();

			// Transform 1 (tail of first chain) should connect to Merge input 0
			expect(json.connections['Transform 1'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Transform 1'].main[0]![0].index).toBe(0);

			// Process 2 should connect to Merge input 1
			expect(json.connections['Process 2'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Process 2'].main[0]![0].index).toBe(1);
		});

		it('should support three or more inputs', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge 3' },
			}) as MergeNode;
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 1' },
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 2' },
			});
			const api3 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 3' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t.to([api1, api2, api3]))
				.add(api1.to(mergeNode.input(0)))
				.add(api2.to(mergeNode.input(1)))
				.add(api3.to(mergeNode.input(2)));

			const json = wf.toJSON();

			expect(json.connections['API 1'].main[0]![0].index).toBe(0);
			expect(json.connections['API 2'].main[0]![0].index).toBe(1);
			expect(json.connections['API 3'].main[0]![0].index).toBe(2);
		});

		it('should not connect to both inputs when using inline chain pattern with .to([])', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: { name: 'Webhook' },
			});
			const mergeResults = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge Results' },
			}) as MergeNode;
			const fetchEmails = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch Emails' },
			});
			const summarizeEmails = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Summarize Emails' },
			});
			const fetchWeather = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch Weather' },
			});

			// Inline chain pattern: two sub-chains in .to([...]) targeting different merge inputs
			const wf = workflow('test-id', 'Test').add(
				webhookTrigger.to([
					fetchEmails.to(summarizeEmails.to(mergeResults.input(0))),
					fetchWeather.to(mergeResults.input(1)),
				]),
			);

			const json = wf.toJSON();

			// Summarize Emails should connect to Merge Results input 0 only
			const summarizeConns = json.connections['Summarize Emails'];
			expect(summarizeConns).toBeDefined();
			expect(summarizeConns.main[0]).toHaveLength(1);
			expect(summarizeConns.main[0]![0].node).toBe('Merge Results');
			expect(summarizeConns.main[0]![0].index).toBe(0);

			// Fetch Weather should connect to Merge Results input 1 only
			const weatherConns = json.connections['Fetch Weather'];
			expect(weatherConns).toBeDefined();
			expect(weatherConns.main[0]).toHaveLength(1);
			expect(weatherConns.main[0]![0].node).toBe('Merge Results');
			expect(weatherConns.main[0]![0].index).toBe(1);
		});
	});
});
