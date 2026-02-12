/**
 * Test file for New Simplified SDK API
 *
 * This file tests the new simplified API design that:
 * 1. Is easier for LLMs to understand and generate
 * 2. Reduces implementation complexity
 * 3. Provides better developer ergonomics
 *
 * TDD: All tests are written FIRST before implementing the features.
 * Each test should FAIL initially until the corresponding feature is implemented.
 */

import type { NodeInstance } from './types/base';
import { workflow } from './workflow-builder';
import { nextBatch } from './workflow-builder/control-flow-builders/next-batch';
import { splitInBatches } from './workflow-builder/control-flow-builders/split-in-batches';
import { node, trigger } from './workflow-builder/node-builders/node-builder';
import { languageModel, tool } from './workflow-builder/node-builders/subnode-builders';

/**
 * Helper to create a simple node with a name
 */
function createNode(name: string, type = 'n8n-nodes-base.set') {
	return node({
		type,
		version: 3.4,
		config: { name },
	});
}

/**
 * Helper to create a trigger node
 */
function createTrigger(name: string) {
	return trigger({
		type: 'n8n-nodes-base.manualTrigger',
		version: 1,
		config: { name },
	});
}

/**
 * Helper to create an IF node
 */
function createIfNode(name: string) {
	return node({
		type: 'n8n-nodes-base.if',
		version: 2.2,
		config: {
			name,
			parameters: {
				conditions: {
					conditions: [
						{
							leftValue: '={{ $json.value }}',
							operator: { type: 'boolean', operation: 'true' },
						},
					],
				},
			},
		},
	}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
}

/**
 * Helper to create a Switch node
 */
function createSwitchNode(name: string) {
	return node({
		type: 'n8n-nodes-base.switch',
		version: 3.2,
		config: {
			name,
			parameters: { mode: 'rules' },
		},
	}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
}

/**
 * Helper to create a Merge node
 */
function createMergeNode(name: string) {
	return node({
		type: 'n8n-nodes-base.merge',
		version: 3,
		config: {
			name,
			parameters: { mode: 'combine' },
		},
	});
}

/**
 * Helper to create a SplitInBatches node
 */
function createSplitInBatchesNode(name: string) {
	return node({
		type: 'n8n-nodes-base.splitInBatches',
		version: 3,
		config: {
			name,
			parameters: { batchSize: 10 },
		},
	}) as NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
}

describe('New SDK API', () => {
	describe('Edge Case 1: Terminal vs Chainable Targets', () => {
		it('allows chaining after .output(n)', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');

			// .output(n).to() should return a chainable target
			// This tests that .output(n) is NOT terminal - you can continue chaining
			const chain = nodeA.to(nodeB, 1); // outputIndex = 1

			// Verify chain is defined and chainable
			expect(chain).toBeDefined();
			expect(chain.head).toBe(nodeA);
			expect(chain.tail).toBe(nodeB);
		});

		it('connects to specific output index via .to(target, outputIndex)', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test').add(t.to(nodeA).to(nodeB, 1)); // Connect A's output 1 to B

			const json = wf.toJSON();

			// Verify A connects to B via output 1
			const connA = json.connections['A'];
			expect(connA).toBeDefined();
			// Output 1 should have the connection
			expect(connA.main[1]).toBeDefined();
			expect(connA.main[1]![0].node).toBe('B');
		});

		it('supports .input(n) for connecting to specific input indices (future API)', () => {
			// NOTE: This test documents the desired NEW API behavior
			// The current API doesn't have .input(n) method - it needs to be added

			const nodeA = createNode('A');
			const mergeNode = createMergeNode('Merge');
			const t = createTrigger('Start');

			// Use .input(n) to specify target input index
			const wf = workflow('test', 'Test').add(t.to(nodeA.to(mergeNode.input(1)))); // Connect to input 1 of merge

			const json = wf.toJSON();

			// Verify connection exists with correct target input index
			const connA = json.connections['A'];
			expect(connA).toBeDefined();
			expect(connA.main[0]![0].node).toBe('Merge');
			expect(connA.main[0]![0].index).toBe(1); // Input index 1
		});

		it('returns terminal InputTarget that cannot be chained', () => {
			const mergeNode = createMergeNode('Merge');

			// .input(n) returns InputTarget which should NOT have .to()
			const inputTarget = mergeNode.input(0);

			expect(inputTarget).toHaveProperty('_isInputTarget', true);
			expect(inputTarget).toHaveProperty('node', mergeNode);
			expect(inputTarget).toHaveProperty('inputIndex', 0);
			// InputTarget should not be chainable (no .then method)
			expect(typeof (inputTarget as unknown as { then?: unknown }).then).toBe('undefined');
		});
	});

	describe('Edge Case 2: Fan-out Within Branches', () => {
		it('supports plain array inside onTrue()', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const ifNode = createIfNode('IF');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test')
				.add(t)
				.to(
					ifNode.onTrue!([nodeA, nodeB]), // IF output 0 (true) -> both A and B
				);

			const json = wf.toJSON();

			// Verify IF output 0 connects to both A and B
			const ifConns = json.connections['IF'];
			expect(ifConns).toBeDefined();
			expect(ifConns.main[0]).toBeDefined();
			expect(ifConns.main[0]).toHaveLength(2);

			const targetNodes = ifConns.main[0]!.map((c) => c.node).sort();
			expect(targetNodes).toEqual(['A', 'B']);
		});

		it('supports plain array inside onCase()', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const nodeC = createNode('C');
			const switchNode = createSwitchNode('Router');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test')
				.add(t)
				.to(switchNode.onCase!(0, [nodeA, nodeB]).onCase(1, nodeC));

			const json = wf.toJSON();

			// Verify switch output 0 connects to both A and B
			const switchConns = json.connections['Router'];
			expect(switchConns).toBeDefined();
			expect(switchConns.main[0]).toHaveLength(2);
			expect(switchConns.main[0]!.map((c) => c.node).sort()).toEqual(['A', 'B']);

			// Verify switch output 1 connects to C
			expect(switchConns.main[1]).toHaveLength(1);
			expect(switchConns.main[1]![0].node).toBe('C');
		});
	});

	describe('Edge Case 3: Builders Are Terminal', () => {
		it('allows nesting builders inside .to() chains', () => {
			// Fluent builders (ifNode.onTrue().onFalse(), switchNode.onCase()) can be passed to .to()
			// and internally handle their branch nodes

			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const ifNode = createIfNode('IF');
			const t = createTrigger('Start');

			// trigger -> IF -> (true: A, false: B)
			const wf = workflow('test', 'Test').add(t).to(ifNode.onTrue!(nodeA).onFalse(nodeB));

			const json = wf.toJSON();

			// All nodes should be present
			expect(json.nodes).toHaveLength(4); // Start, IF, A, B

			// Trigger connects to IF
			expect(json.connections['Start'].main[0]![0].node).toBe('IF');

			// IF connects to branches
			expect(json.connections['IF'].main[0]![0].node).toBe('A');
			expect(json.connections['IF'].main[1]![0].node).toBe('B');
		});
	});

	describe('Edge Case 4: Branch Convergence', () => {
		it('deduplicates same node in multiple branches', () => {
			const convergence = createNode('Convergence');
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const ifNode = createIfNode('IF');
			const t = createTrigger('Start');

			// Both branches converge to the same node instance
			const wf = workflow('test', 'Test')
				.add(t)
				.to(
					ifNode.onTrue!(nodeA.to(convergence)).onFalse(nodeB.to(convergence)), // Same instance
				);

			const json = wf.toJSON();

			// Should have 5 nodes: Start, IF, A, B, Convergence (not 6)
			expect(json.nodes).toHaveLength(5);

			// Convergence should only appear once
			const convergenceNodes = json.nodes.filter((n) => n.name === 'Convergence');
			expect(convergenceNodes).toHaveLength(1);

			// Both branches should connect to the same Convergence node
			expect(json.connections['A'].main[0]![0].node).toBe('Convergence');
			expect(json.connections['B'].main[0]![0].node).toBe('Convergence');
		});
	});

	describe('Edge Case 5: Cycle/Loop Connections', () => {
		it('allows node to connect back to earlier node', () => {
			const checkStatus = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Check' },
			});
			const wait = node({
				type: 'n8n-nodes-base.wait',
				version: 1,
				config: { name: 'Wait' },
			});
			const getResult = createNode('Result');
			const jobComplete = createIfNode('Done?');
			const t = createTrigger('Start');

			// Start -> Check -> Done? -> (true: Result, false: Wait -> Check)
			// Use workflow.to() with fluent builder
			const wf = workflow('test', 'Test')
				.add(t.to(checkStatus))
				.to(
					jobComplete.onTrue!(getResult).onFalse(wait.to(checkStatus)), // Loop back
				);

			const json = wf.toJSON();

			// Verify Wait connects back to Check
			expect(json.connections['Wait']).toBeDefined();
			expect(json.connections['Wait'].main[0]![0].node).toBe('Check');
		});
	});

	describe('Edge Case 6: Sparse Switch Cases', () => {
		it('only emits configured cases, skip indices', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const switchNode = createSwitchNode('Router');
			const t = createTrigger('Start');

			// Only case0 and case3, skip 1 and 2
			const wf = workflow('test', 'Test').add(t).to(
				switchNode.onCase!(0, nodeA).onCase(3, nodeB), // Skip 1, 2
			);

			const json = wf.toJSON();

			const switchConns = json.connections['Router'].main;

			// Output 0 connects to A
			expect(switchConns[0]).toBeDefined();
			expect(switchConns[0]![0].node).toBe('A');

			// Outputs 1, 2 should be undefined or empty
			expect(switchConns[1] ?? []).toHaveLength(0);
			expect(switchConns[2] ?? []).toHaveLength(0);

			// Output 3 connects to B
			expect(switchConns[3]).toBeDefined();
			expect(switchConns[3]![0].node).toBe('B');
		});
	});

	describe('Edge Case 7: Single-Branch IF', () => {
		it('works with only onTrue()', () => {
			const nodeA = createNode('A');
			const ifNode = createIfNode('IF');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test').add(t).to(ifNode.onTrue!(nodeA));

			const json = wf.toJSON();

			// IF should only have output 0 connected
			expect(json.connections['IF'].main[0]![0].node).toBe('A');
			// Output 1 should have no connections
			expect(json.connections['IF'].main[1] ?? []).toHaveLength(0);
		});

		it('works with only onFalse()', () => {
			const nodeB = createNode('B');
			const ifNode = createIfNode('IF');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test').add(t).to(ifNode.onFalse!(nodeB));

			const json = wf.toJSON();

			// IF output 0 should have no connections
			expect(json.connections['IF'].main[0] ?? []).toHaveLength(0);
			// Output 1 should be connected
			expect(json.connections['IF'].main[1]![0].node).toBe('B');
		});
	});

	describe('Edge Case 8: Multiple Triggers to Shared Nodes', () => {
		it('preserves all trigger connections to shared node', () => {
			const shared = createNode('Shared');
			const manual = createTrigger('Manual');
			const schedule = trigger({
				type: 'n8n-nodes-base.scheduleTrigger',
				version: 1.1,
				config: { name: 'Schedule' },
			});

			const wf = workflow('test', 'Test').add(manual.to(shared)).add(schedule.to(shared));

			const json = wf.toJSON();

			// Both triggers should connect to Shared
			expect(json.connections['Manual'].main[0]![0].node).toBe('Shared');
			expect(json.connections['Schedule'].main[0]![0].node).toBe('Shared');

			// Shared should only exist once
			const sharedNodes = json.nodes.filter((n) => n.name === 'Shared');
			expect(sharedNodes).toHaveLength(1);
		});
	});

	describe('Edge Case 9: Multi-Output Nodes', () => {
		it('supports .to(target, outputIndex) on any node type', () => {
			// Text classifier has multiple outputs based on classification
			const classifier = node({
				type: '@n8n/n8n-nodes-langchain.textClassifier',
				version: 1.2,
				config: { name: 'Classifier' },
			});
			const categoryA = createNode('Category A');
			const categoryB = createNode('Category B');
			const categoryC = createNode('Category C');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test')
				.add(t.to(classifier))
				.add(classifier.to(categoryA, 0)) // Output 0 -> Category A
				.add(classifier.to(categoryB, 1)) // Output 1 -> Category B
				.add(classifier.to(categoryC, 2)); // Output 2 -> Category C

			const json = wf.toJSON();

			const classifierConns = json.connections['Classifier'].main;
			expect(classifierConns[0]![0].node).toBe('Category A');
			expect(classifierConns[1]![0].node).toBe('Category B');
			expect(classifierConns[2]![0].node).toBe('Category C');
		});
	});

	describe('Edge Case 10: SplitInBatches to Different Merge Inputs', () => {
		it('connects done/each to different merge inputs', () => {
			const mergeNode = createMergeNode('Merge');
			const sibNode = createSplitInBatchesNode('Batch');
			const processNode = createNode('Process');
			const summaryNode = createNode('Summary');
			const finalNode = createNode('Final');
			const t = createTrigger('Start');

			// Using named object syntax with explicit connections
			const wf = workflow('test', 'Test')
				.add(t)
				.to(
					splitInBatches(sibNode, {
						done: summaryNode, // Done output (0) -> Summary
						each: processNode, // Each output (1) -> Process
					}),
				)
				// Connect summary to merge input 0
				.add(summaryNode)
				.add(mergeNode)
				.connect(summaryNode, 0, mergeNode, 0)
				// Connect process to merge input 1
				.connect(processNode, 0, mergeNode, 1)
				// Merge to final
				.add(finalNode)
				.connect(mergeNode, 0, finalNode, 0);

			const json = wf.toJSON();

			// Verify SIB connections
			const sibConns = json.connections['Batch'].main;
			expect(sibConns[0]![0].node).toBe('Summary'); // done -> Summary
			expect(sibConns[1]![0].node).toBe('Process'); // each -> Process

			// Verify merge input connections
			const summaryConn = json.connections['Summary'].main[0]![0];
			expect(summaryConn.node).toBe('Merge');
			expect(summaryConn.index).toBe(0);

			const processConn = json.connections['Process'].main[0]![0];
			expect(processConn.node).toBe('Merge');
			expect(processConn.index).toBe(1);
		});
	});

	describe('Edge Case 11: Fan-out Then Merge', () => {
		it('supports fan-out targets connecting to merge inputs', () => {
			const mergeNode = createMergeNode('Merge');
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const finalNode = createNode('Final');
			const t = createTrigger('Start');

			// Fan out from trigger, then merge
			// Use array syntax for fan-out since that's well-typed
			const wf = workflow('test', 'Test')
				.add(t.to([nodeA, nodeB]))
				.add(mergeNode)
				// Connect A to merge input 0
				.connect(nodeA, 0, mergeNode, 0)
				// Connect B to merge input 1
				.connect(nodeB, 0, mergeNode, 1)
				.add(finalNode)
				.connect(mergeNode, 0, finalNode, 0);

			const json = wf.toJSON();

			// Trigger should connect to both A and B
			expect(json.connections['Start'].main[0]).toHaveLength(2);

			// A and B should connect to different merge inputs
			expect(json.connections['A'].main[0]![0].node).toBe('Merge');
			expect(json.connections['A'].main[0]![0].index).toBe(0);

			expect(json.connections['B'].main[0]![0].node).toBe('Merge');
			expect(json.connections['B'].main[0]![0].index).toBe(1);
		});
	});

	describe('Edge Case 12: Error Output Connections', () => {
		it('supports .onError() for error output', () => {
			const http = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'HTTP',
					onError: 'continueErrorOutput',
				},
			});
			const success = createNode('Success');
			const errorHandler = createNode('Error');
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test')
				.add(t.to(http))
				.add(http.to(success)) // Output 0 -> Success
				.add(http.onError(errorHandler)); // Output 1 (error) -> Error

			const json = wf.toJSON();

			// HTTP output 0 -> Success
			expect(json.connections['HTTP'].main[0]![0].node).toBe('Success');
			// HTTP output 1 (error) -> Error
			expect(json.connections['HTTP'].main[1]![0].node).toBe('Error');
		});
	});

	describe('Edge Case 13: Subnode Connections', () => {
		it('handles subnodes via object config', () => {
			const openAiModel = languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					name: 'OpenAI Model',
					parameters: { model: 'gpt-4' },
				},
			});

			const httpTool = tool({
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				version: 1.1,
				config: {
					name: 'HTTP Tool',
					parameters: { url: 'https://api.example.com' },
				},
			});

			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					name: 'AI Agent',
					parameters: { promptType: 'define', text: 'You are helpful' },
					subnodes: {
						model: openAiModel,
						tools: [httpTool],
					},
				},
			});

			const t = createTrigger('Start');
			const wf = workflow('test', 'Test').add(t.to(agent));

			const json = wf.toJSON();

			// Agent node should be present
			expect(json.nodes.find((n) => n.name === 'AI Agent')).toBeDefined();

			// Subnode connections should use ai_* connection types
			const modelConnections = json.connections['OpenAI Model'];
			expect(modelConnections?.ai_languageModel?.[0]?.[0]?.node).toBe('AI Agent');

			const toolConnections = json.connections['HTTP Tool'];
			expect(toolConnections?.ai_tool?.[0]?.[0]?.node).toBe('AI Agent');
		});
	});

	describe('Edge Case 14: Duplicate Node Names', () => {
		it('auto-renames duplicate names at build time', () => {
			const nodeA = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});
			const nodeB = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' }, // Same name
			});
			const t = createTrigger('Start');

			const wf = workflow('test', 'Test').add(t.to(nodeA).to(nodeB));

			const json = wf.toJSON();

			// Extract names
			const names = json.nodes.map((n) => n.name);

			// All names should be unique
			expect(new Set(names).size).toBe(names.length);

			// Should have renamed one to "Process 1" or similar
			expect(names).toContain('Process');
			// Second one should have been renamed
			const processVariants = names.filter((n) => n?.startsWith('Process'));
			expect(processVariants.length).toBe(2);
			expect(processVariants.some((n) => n !== 'Process')).toBe(true);
		});
	});

	describe('New API Design: workflow.add() chainable', () => {
		it('workflow.add() returns workflow for fluent chaining', () => {
			const nodeA = createNode('A');
			const nodeB = createNode('B');
			const t = createTrigger('Start');

			// Multiple .add() calls should chain
			const wf = workflow('test', 'Test').add(t.to(nodeA)).add(nodeB); // Returns workflow, not void

			expect(wf.toJSON).toBeDefined();

			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(3);
		});
	});

	describe('nextBatch() Helper', () => {
		it('returns the sibNode from a SplitInBatches builder', () => {
			const sibNode = createSplitInBatchesNode('Batch');
			const processNode = createNode('Process');

			// Using splitInBatches returns a builder with sibNode property
			const builder = splitInBatches(sibNode, {
				done: createNode('Done'),
				each: processNode,
			});

			// nextBatch() should extract the sibNode from the builder
			const result = nextBatch(builder);

			// Result should be the original sibNode
			expect(result).toBe(sibNode);
		});

		it('returns the node directly when passed a NodeInstance', () => {
			const sibNode = createSplitInBatchesNode('Batch');

			// When passing NodeInstance directly, nextBatch() should return it
			const result = nextBatch(sibNode);

			expect(result).toBe(sibNode);
		});

		it('enables loop-back connections in split in batches workflows', () => {
			const t = createTrigger('Start');
			const sibNode = createSplitInBatchesNode('Process Batches');
			const processItem = createNode('Process Item');
			const summarize = createNode('Summarize');

			// Using nextBatch(sibNode) directly for loop-back
			// (passing the node instead of builder avoids circular reference)
			const sibBuilder = splitInBatches(sibNode, {
				done: summarize,
				each: processItem.to(nextBatch(sibNode)), // Use nextBatch for explicit loop-back
			});

			const wf = workflow('test', 'Batch Processing').add(t).to(sibBuilder);

			const json = wf.toJSON();

			// Verify batch loop structure
			expect(json.connections['Process Batches'].main[0]![0].node).toBe('Summarize');
			expect(json.connections['Process Batches'].main[1]![0].node).toBe('Process Item');
			// Process Item loops back to Split In Batches via nextBatch()
			expect(json.connections['Process Item'].main[0]![0].node).toBe('Process Batches');
		});
	});

	describe('API Integration: Complete Workflow Examples', () => {
		it('builds a basic workflow with branching', () => {
			const t = createTrigger('Start');
			const ifNode = createIfNode('Check Value');
			const trueHandler = createNode('Handle True');
			const falseHandler = createNode('Handle False');
			const finalNode = createNode('Finalize');

			const wf = workflow('test', 'Branching Workflow')
				.add(t)
				.to(
					ifNode.onTrue!(trueHandler.to(finalNode)).onFalse(falseHandler.to(finalNode)), // Converge
				);

			const json = wf.toJSON();

			// Verify structure
			expect(json.name).toBe('Branching Workflow');
			expect(json.nodes).toHaveLength(5);

			// Verify connections
			expect(json.connections['Start'].main[0]![0].node).toBe('Check Value');
			expect(json.connections['Check Value'].main[0]![0].node).toBe('Handle True');
			expect(json.connections['Check Value'].main[1]![0].node).toBe('Handle False');
			expect(json.connections['Handle True'].main[0]![0].node).toBe('Finalize');
			expect(json.connections['Handle False'].main[0]![0].node).toBe('Finalize');
		});

		it('builds a batch processing workflow with loop', () => {
			const t = createTrigger('Start');
			const fetchData = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Fetch Data' },
			});
			const sibNode = createSplitInBatchesNode('Process Batches');
			const processItem = createNode('Process Item');
			const summarize = createNode('Summarize');

			const wf = workflow('test', 'Batch Processing')
				.add(t.to(fetchData))
				.to(
					splitInBatches(sibNode, {
						done: summarize,
						each: processItem.to(sibNode), // Loop back
					}),
				);

			const json = wf.toJSON();

			// Verify batch loop structure
			expect(json.connections['Process Batches'].main[0]![0].node).toBe('Summarize');
			expect(json.connections['Process Batches'].main[1]![0].node).toBe('Process Item');
			// Process Item loops back to Split In Batches
			expect(json.connections['Process Item'].main[0]![0].node).toBe('Process Batches');
		});

		it('builds an error handling workflow', () => {
			const t = createTrigger('Start');
			const riskyOperation = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'Risky API Call',
					onError: 'continueErrorOutput',
				},
			});
			const successPath = createNode('Process Success');
			const errorPath = createNode('Handle Error');
			const notify = createNode('Notify');

			const wf = workflow('test', 'Error Handling')
				.add(t.to(riskyOperation))
				.add(riskyOperation.to(successPath.to(notify)))
				.add(riskyOperation.onError(errorPath.to(notify)));

			const json = wf.toJSON();

			// Both success and error paths should converge at Notify
			expect(json.connections['Risky API Call'].main[0]![0].node).toBe('Process Success');
			expect(json.connections['Risky API Call'].main[1]![0].node).toBe('Handle Error');
			expect(json.connections['Process Success'].main[0]![0].node).toBe('Notify');
			expect(json.connections['Handle Error'].main[0]![0].node).toBe('Notify');
		});
	});
});
