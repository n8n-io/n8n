import { merge, isMergeNamedInputSyntax } from '../merge';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { fanIn } from '../fan-in';

describe('Merge', () => {
	describe('merge() requires named syntax only', () => {
		it('should require a merge node as first argument', () => {
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

			// Array syntax should throw an error - named syntax is required
			expect(() => {
				// @ts-expect-error - Testing runtime rejection of array syntax
				merge([api1, api2]);
			}).toThrow('merge() requires a Merge node as first argument');
		});

		it('should require named inputs { input0, input1, ... } as second argument', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'My Merge' },
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

			// Passing array as first argument should throw
			expect(() => {
				// @ts-expect-error - Testing runtime rejection of array syntax
				merge([branch1, branch2], mergeNode);
			}).toThrow('merge() requires a Merge node as first argument');
		});

		it('should work with named syntax: merge(mergeNode, { input0, input1 })', () => {
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

			// Named syntax should work
			const composite = merge(mergeNode, { input0: source1, input1: source2 });
			expect(composite.mergeNode).toBe(mergeNode);
			expect(isMergeNamedInputSyntax(composite)).toBe(true);
		});

		it('should always return named input syntax composites', () => {
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

			const composite = merge(mergeNode, { input0: source1, input1: source2 });
			// All composites should now be named input syntax
			expect(isMergeNamedInputSyntax(composite)).toBe(true);
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
