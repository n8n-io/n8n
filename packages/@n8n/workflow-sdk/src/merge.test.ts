import type { NodeInstance } from './types/base';
import { workflow } from './workflow-builder';
import { splitInBatches } from './workflow-builder/control-flow-builders/split-in-batches';
import { node, trigger } from './workflow-builder/node-builders/node-builder';

// Helper types
type MergeNode = NodeInstance<'n8n-nodes-base.merge', string, unknown>;
type IfNode = NodeInstance<'n8n-nodes-base.if', string, unknown>;
type SwitchNode = NodeInstance<'n8n-nodes-base.switch', string, unknown>;
type SplitInBatchesNode = NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;

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

		it('should connect merge inputs via WorkflowBuilder.to() pattern', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: { name: 'Website Form' },
			});
			const gmailTrigger = trigger({
				type: 'n8n-nodes-base.gmailTrigger',
				version: 1.3,
				config: { name: 'Incoming Email' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Combine Sources' },
			}) as MergeNode;
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});

			// Pattern: .add(source).to(merge.input(n)) -- WorkflowBuilder.to()
			const wf = workflow('test-id', 'Test')
				.add(webhookTrigger)
				.to(mergeNode.input(0))
				.add(gmailTrigger)
				.to(mergeNode.input(1))
				.add(mergeNode)
				.to(downstream);

			const json = wf.toJSON();

			// Both triggers should connect to the merge node
			const webhookConns = json.connections['Website Form'];
			expect(webhookConns.main[0]![0].node).toBe('Combine Sources');
			expect(webhookConns.main[0]![0].index).toBe(0);

			const gmailConns = json.connections['Incoming Email'];
			expect(gmailConns.main[0]![0].node).toBe('Combine Sources');
			expect(gmailConns.main[0]![0].index).toBe(1);

			// Merge should connect to downstream
			const mergeConns = json.connections['Combine Sources'];
			expect(mergeConns.main[0]![0].node).toBe('Process');
		});

		it('should connect IF true/false branches to merge via WorkflowBuilder.to()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'Check' },
			}) as IfNode;
			const processTrue = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process True' },
			});
			const processFalse = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process False' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Combine' },
			}) as MergeNode;
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Final' },
			});

			// IF branches processed separately, then each branch connects to merge via builder .to()
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(ifNode.onTrue!(processTrue).onFalse(processFalse))
				.add(processTrue)
				.to(mergeNode.input(0))
				.add(processFalse)
				.to(mergeNode.input(1))
				.add(mergeNode)
				.to(downstream);

			const json = wf.toJSON();

			// IF should branch to both process nodes
			expect(json.connections['Check'].main[0]![0].node).toBe('Process True');
			expect(json.connections['Check'].main[1]![0].node).toBe('Process False');

			// Each process node should connect to the correct merge input
			expect(json.connections['Process True'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Process True'].main[0]![0].index).toBe(0);
			expect(json.connections['Process False'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Process False'].main[0]![0].index).toBe(1);

			// Merge should connect to downstream
			expect(json.connections['Combine'].main[0]![0].node).toBe('Final');
		});

		it('should connect Switch cases to merge via WorkflowBuilder.to()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'Route' },
			}) as SwitchNode;
			const handleA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handle A' },
			});
			const handleB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handle B' },
			});
			const handleC = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Handle C' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Collect' },
			}) as MergeNode;

			// Switch fans out, then each case connects to merge via builder .to()
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, handleA).onCase(1, handleB).onCase(2, handleC))
				.add(handleA)
				.to(mergeNode.input(0))
				.add(handleB)
				.to(mergeNode.input(1))
				.add(handleC)
				.to(mergeNode.input(2));

			const json = wf.toJSON();

			// Switch should fan out to all three handlers
			expect(json.connections['Route'].main[0]![0].node).toBe('Handle A');
			expect(json.connections['Route'].main[1]![0].node).toBe('Handle B');
			expect(json.connections['Route'].main[2]![0].node).toBe('Handle C');

			// Each handler should connect to the correct merge input
			expect(json.connections['Handle A'].main[0]![0].node).toBe('Collect');
			expect(json.connections['Handle A'].main[0]![0].index).toBe(0);
			expect(json.connections['Handle B'].main[0]![0].node).toBe('Collect');
			expect(json.connections['Handle B'].main[0]![0].index).toBe(1);
			expect(json.connections['Handle C'].main[0]![0].node).toBe('Collect');
			expect(json.connections['Handle C'].main[0]![0].index).toBe(2);
		});

		it('should connect SplitInBatches done output to merge via WorkflowBuilder.to()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const sibNode = node({
				type: 'n8n-nodes-base.splitInBatches',
				version: 3,
				config: { name: 'Loop' },
			}) as SplitInBatchesNode;
			const processBatch = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process Batch' },
			});
			const batchDone = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Batch Done' },
			});
			const otherSource = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch Data' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge Results' },
			}) as MergeNode;
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Output' },
			});

			// SIB done branch tail connects to merge input 0 via builder .to(),
			// separate trigger source connects to merge input 1 via builder .to()
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(splitInBatches(sibNode).onEachBatch(processBatch.to(sibNode)).onDone(batchDone))
				.add(batchDone)
				.to(mergeNode.input(0))
				.add(otherSource)
				.to(mergeNode.input(1))
				.add(mergeNode)
				.to(downstream);

			const json = wf.toJSON();

			// SIB should have loop-back from processBatch
			expect(json.connections['Process Batch'].main[0]![0].node).toBe('Loop');

			// Batch Done (SIB done branch tail) should connect to merge input 0
			expect(json.connections['Batch Done'].main[0]![0].node).toBe('Merge Results');
			expect(json.connections['Batch Done'].main[0]![0].index).toBe(0);

			// Fetch Data should connect to merge input 1
			expect(json.connections['Fetch Data'].main[0]![0].node).toBe('Merge Results');
			expect(json.connections['Fetch Data'].main[0]![0].index).toBe(1);

			// Merge should connect to downstream
			expect(json.connections['Merge Results'].main[0]![0].node).toBe('Output');
		});

		it('should handle WorkflowBuilder.to() to same merge node from already-added node', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
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
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Join' },
			}) as MergeNode;

			// First .to(merge.input(0)) adds the merge node,
			// second .to(merge.input(1)) should reuse it (already present)
			const wf = workflow('test-id', 'Test')
				.add(t.to([source1, source2]))
				.add(source1)
				.to(mergeNode.input(0))
				.add(source2)
				.to(mergeNode.input(1));

			const json = wf.toJSON();

			// Should have only one merge node, not duplicated
			const mergeNodes = json.nodes.filter((n) => n.name === 'Join');
			expect(mergeNodes).toHaveLength(1);

			// Both sources should connect to the merge
			expect(json.connections['Source 1'].main[0]![0].node).toBe('Join');
			expect(json.connections['Source 1'].main[0]![0].index).toBe(0);
			expect(json.connections['Source 2'].main[0]![0].node).toBe('Join');
			expect(json.connections['Source 2'].main[0]![0].index).toBe(1);
		});

		it('should not create duplicate connections when .to(merge.input(n)) is called twice from same source', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const source = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge' },
			}) as MergeNode;

			// .add(source).to(input(0)) then re-add source and .to(input(0)) again
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(source)
				.to(mergeNode.input(0))
				.add(source)
				.to(mergeNode.input(0));

			const json = wf.toJSON();

			// Source should have exactly one connection to Merge input 0, not two
			const sourceConns = json.connections['Source']?.main[0] ?? [];
			const mergeConnections = sourceConns.filter((c) => c.node === 'Merge' && c.index === 0);
			expect(mergeConnections).toHaveLength(1);
		});

		it('should chain downstream after WorkflowBuilder.to(inputTarget)', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const source = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Source' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge' },
			}) as MergeNode;
			const next = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Next' },
			});

			// After .to(merge.input(n)), current node becomes the merge node,
			// so .to(next) should connect merge → next
			const wf = workflow('test-id', 'Test').add(t).to(source).to(mergeNode.input(0)).to(next);

			const json = wf.toJSON();

			expect(json.connections['Source'].main[0]![0].node).toBe('Merge');
			expect(json.connections['Source'].main[0]![0].index).toBe(0);
			expect(json.connections['Merge'].main[0]![0].node).toBe('Next');
		});

		it('should support merge node self-loop via WorkflowBuilder.to()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Accumulator' },
			}) as MergeNode;
			const process = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});

			// Merge output loops back into its own input 1 via a processing step
			const wf = workflow('test-id', 'Test')
				.add(t)
				.to(mergeNode.input(0))
				.add(mergeNode)
				.to(process)
				.to(mergeNode.input(1));

			const json = wf.toJSON();

			// Trigger connects to merge input 0
			expect(json.connections['Manual Trigger'].main[0]![0].node).toBe('Accumulator');
			expect(json.connections['Manual Trigger'].main[0]![0].index).toBe(0);

			// Merge connects to process
			expect(json.connections['Accumulator'].main[0]![0].node).toBe('Process');

			// Process loops back to merge input 1
			expect(json.connections['Process'].main[0]![0].node).toBe('Accumulator');
			expect(json.connections['Process'].main[0]![0].index).toBe(1);
		});

		it('should handle duplicate source names connecting to merge inputs', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			// Two nodes with the same default name - second one gets auto-renamed to "Process 1"
			const process1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const process2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Combine' },
			}) as MergeNode;
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Output' },
			});

			// Use node-instance .to() for duplicate-named sources (handles auto-rename),
			// then WorkflowBuilder .to() for merge → downstream
			const wf = workflow('test-id', 'Test')
				.add(t.to([process1, process2]))
				.add(process1.to(mergeNode.input(0)))
				.add(process2.to(mergeNode.input(1)))
				.add(mergeNode)
				.to(downstream);

			const json = wf.toJSON();

			// Both Process nodes should exist (one auto-renamed)
			const processNodes = json.nodes.filter((n) => n.name?.startsWith('Process'));
			expect(processNodes).toHaveLength(2);
			const processNames = processNodes.map((n) => n.name).sort();
			expect(processNames).toEqual(['Process', 'Process 1']);

			// Process connects to merge input 0
			expect(json.connections['Process'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Process'].main[0]![0].index).toBe(0);

			// Process 1 (auto-renamed) connects to merge input 1
			expect(json.connections['Process 1'].main[0]![0].node).toBe('Combine');
			expect(json.connections['Process 1'].main[0]![0].index).toBe(1);

			// Merge connects to downstream via WorkflowBuilder.to()
			expect(json.connections['Combine'].main[0]![0].node).toBe('Output');
		});

		it('should connect two merge nodes to each other via WorkflowBuilder.to()', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const sourceA = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch A' },
			});
			const sourceB = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch B' },
			});
			const sourceC = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch C' },
			});
			const merge1 = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge AB' },
			}) as MergeNode;
			const merge2 = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge Final' },
			}) as MergeNode;
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Output' },
			});

			// Merge1 combines A+B, then Merge2 combines Merge1's output with C
			const wf = workflow('test-id', 'Test')
				.add(t.to([sourceA, sourceB, sourceC]))
				.add(sourceA)
				.to(merge1.input(0))
				.add(sourceB)
				.to(merge1.input(1))
				.add(merge1)
				.to(merge2.input(0))
				.add(sourceC)
				.to(merge2.input(1))
				.add(merge2)
				.to(downstream);

			const json = wf.toJSON();

			// Sources connect to first merge
			expect(json.connections['Fetch A'].main[0]![0].node).toBe('Merge AB');
			expect(json.connections['Fetch A'].main[0]![0].index).toBe(0);
			expect(json.connections['Fetch B'].main[0]![0].node).toBe('Merge AB');
			expect(json.connections['Fetch B'].main[0]![0].index).toBe(1);

			// First merge output feeds into second merge input 0
			expect(json.connections['Merge AB'].main[0]![0].node).toBe('Merge Final');
			expect(json.connections['Merge AB'].main[0]![0].index).toBe(0);

			// Source C feeds into second merge input 1
			expect(json.connections['Fetch C'].main[0]![0].node).toBe('Merge Final');
			expect(json.connections['Fetch C'].main[0]![0].index).toBe(1);

			// Second merge connects to downstream
			expect(json.connections['Merge Final'].main[0]![0].node).toBe('Output');
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

		it('should handle duplicate node names with workflow-level .to() to merge inputs', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Combine' },
			}) as MergeNode;
			// Both nodes have the same name - second will be auto-renamed to "Process 1"
			const process1 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const process2 = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process' },
			});
			const downstream = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Downstream' },
			});

			// Use workflow-level .add()/.to() pattern (not node-instance .to() workaround)
			const wf = workflow('test-id', 'Test')
				.add(t.to([process1, process2]))
				.add(process1)
				.to(mergeNode.input(0))
				.add(process2)
				.to(mergeNode.input(1))
				.add(mergeNode)
				.to(downstream);

			const json = wf.toJSON();

			// Should have: trigger, process1 ("Process"), process2 ("Process 1"), merge, downstream
			expect(json.nodes).toHaveLength(5);

			// Verify auto-rename happened
			const names = json.nodes.map((n) => n.name).sort();
			expect(names).toContain('Process');
			expect(names).toContain('Process 1');

			// "Process" should connect to Combine input 0
			const process1Conns = json.connections['Process'];
			expect(process1Conns).toBeDefined();
			expect(process1Conns.main[0]![0].node).toBe('Combine');
			expect(process1Conns.main[0]![0].index).toBe(0);

			// "Process 1" (auto-renamed) should connect to Combine input 1
			const process2Conns = json.connections['Process 1'];
			expect(process2Conns).toBeDefined();
			expect(process2Conns.main[0]![0].node).toBe('Combine');
			expect(process2Conns.main[0]![0].index).toBe(1);

			// Combine should connect to Downstream
			const mergeConns = json.connections['Combine'];
			expect(mergeConns).toBeDefined();
			expect(mergeConns.main[0]![0].node).toBe('Downstream');
		});
	});
});
