import { merge } from '../merge';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { fanIn } from '../fan-in';

describe('Merge', () => {
	describe('merge()', () => {
		it('should create a merge composite with branches', () => {
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 1',
					parameters: { url: 'https://api1.example.com' },
				},
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 2',
					parameters: { url: 'https://api2.example.com' },
				},
			});

			const m = merge([api1, api2]);
			expect(m.mergeNode).toBeDefined();
			expect(m.branches).toHaveLength(2);
			expect(m.mode).toBe('append'); // default mode
		});

		it('should support combine mode', () => {
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

			const m = merge([api1, api2], { mode: 'combine' });
			expect(m.mode).toBe('combine');
		});

		it('should support multiplex mode', () => {
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

			const m = merge([api1, api2], { mode: 'multiplex' });
			expect(m.mode).toBe('multiplex');
		});

		it('should support chooseBranch mode', () => {
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

			const m = merge([api1, api2], { mode: 'chooseBranch' });
			expect(m.mode).toBe('chooseBranch');
		});
	});

	describe('merge() with pre-declared node', () => {
		it('should accept a pre-declared node instance as second argument', () => {
			// Pre-declare a merge node
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: {
					name: 'My Merge',
					parameters: { numberInputs: 2 },
				},
			});

			const branch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 1' },
			});
			const branch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 2' },
			});

			// Pass the pre-declared node as second argument
			const m = merge([branch1, branch2], mergeNode);

			// Should use the pre-declared node, not create a new one
			expect(m.mergeNode).toBe(mergeNode);
			expect(m.mergeNode.name).toBe('My Merge');
			expect(m.branches).toHaveLength(2);
		});

		it('should support chaining after merge with pre-declared node', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Pre-declared Merge' },
			});

			const branch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 1' },
			});
			const branch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 2' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Downstream' },
			});

			// This pattern is used in generated code
			const m = merge([branch1, branch2], mergeNode);
			const chain = m.then(downstream);

			expect(chain.tail.name).toBe('Downstream');
		});

		it('should work in workflow builder with pre-declared merge node', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Pre-declared Merge' },
			});

			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const branch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 1' },
			});
			const branch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 2' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Downstream' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(merge([branch1, branch2], mergeNode))
				.then(downstream);

			const json = wf.toJSON();

			// Should have: trigger, branch1, branch2, merge, downstream = 5 nodes
			expect(json.nodes).toHaveLength(5);

			// The merge node should be the pre-declared one
			const foundMerge = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(foundMerge?.name).toBe('Pre-declared Merge');
		});
	});

	describe('workflow integration', () => {
		it('should integrate merge with workflow builder', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 1',
					parameters: { url: 'https://api1.example.com' },
				},
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 2',
					parameters: { url: 'https://api2.example.com' },
				},
			});
			const processResults = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process Results' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(merge([api1, api2], { mode: 'combine' }))
				.then(processResults);

			const json = wf.toJSON();

			// Should have: trigger, api1, api2, merge, processResults
			expect(json.nodes.length).toBeGreaterThanOrEqual(4);

			// Trigger should connect to both API nodes
			const triggerConnections = json.connections[t.name];
			expect(triggerConnections).toBeDefined();

			// Merge node should exist
			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();

			// Merge should connect to process results
			expect(json.connections[mergeNode!.name]).toBeDefined();
		});

		it('should support three branches merging', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
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
				.add(t)
				.then(merge([api1, api2, api3]));

			const json = wf.toJSON();

			// Find merge node
			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();

			// Merge should have 3 inputs
			// Check that all 3 API nodes connect to the merge
			let inputCount = 0;
			for (const conns of Object.values(json.connections)) {
				for (const outputs of conns.main || []) {
					for (const conn of outputs || []) {
						if (conn.node === mergeNode!.name) {
							inputCount++;
						}
					}
				}
			}
			expect(inputCount).toBe(3);
		});
	});

	describe('named input syntax', () => {
		it('should support merge(node, { input0, input1 }) syntax', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			});
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

			// Named input syntax
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					merge(mergeNode, {
						input0: source1,
						input1: source2,
					}).then(downstream),
				);

			const json = wf.toJSON();

			// Should have: trigger, source1, source2, merge, downstream
			expect(json.nodes).toHaveLength(5);

			// Trigger should fan-out to both source nodes
			const triggerConns = json.connections['Manual Trigger'];
			expect(triggerConns).toBeDefined();
			const triggerTargets = triggerConns.main[0].map((c: { node: string }) => c.node).sort();
			expect(triggerTargets).toEqual(['Source 1', 'Source 2']);

			// Source 1 should connect to Merge input 0
			const source1Conns = json.connections['Source 1'];
			expect(source1Conns).toBeDefined();
			expect(source1Conns.main[0][0].node).toBe('My Merge');
			expect(source1Conns.main[0][0].index).toBe(0);

			// Source 2 should connect to Merge input 1
			const source2Conns = json.connections['Source 2'];
			expect(source2Conns).toBeDefined();
			expect(source2Conns.main[0][0].node).toBe('My Merge');
			expect(source2Conns.main[0][0].index).toBe(1);

			// Merge should connect to downstream
			const mergeConns = json.connections['My Merge'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0][0].node).toBe('Downstream');
		});

		it('should support fanIn() for multiple sources to same input', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
			});
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

			// Fan-in: multiple sources to same input
			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(
					merge(mergeNode, {
						input0: fanIn(sourceA, sourceB), // both A and B go to input 0
						input1: sourceC, // C goes to input 1
					}),
				);

			const json = wf.toJSON();

			// Should have: trigger, sourceA, sourceB, sourceC, merge
			expect(json.nodes).toHaveLength(5);

			// Source A should connect to Merge input 0
			const sourceAConns = json.connections['Source A'];
			expect(sourceAConns).toBeDefined();
			expect(sourceAConns.main[0][0].node).toBe('My Merge');
			expect(sourceAConns.main[0][0].index).toBe(0);

			// Source B should also connect to Merge input 0
			const sourceBConns = json.connections['Source B'];
			expect(sourceBConns).toBeDefined();
			expect(sourceBConns.main[0][0].node).toBe('My Merge');
			expect(sourceBConns.main[0][0].index).toBe(0);

			// Source C should connect to Merge input 1
			const sourceCConns = json.connections['Source C'];
			expect(sourceCConns).toBeDefined();
			expect(sourceCConns.main[0][0].node).toBe('My Merge');
			expect(sourceCConns.main[0][0].index).toBe(1);
		});
	});
});
