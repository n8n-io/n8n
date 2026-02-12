/**
 * Roundtrip tests for SDK edge cases
 *
 * These tests verify that each edge case can be:
 * 1. Represented as workflow JSON
 * 2. Generated as TypeScript SDK code
 * 3. Parsed back to produce equivalent JSON
 *
 * Pattern: JSON → code → JSON (roundtrip)
 */

import { generateWorkflowCode } from './index';
import { parseWorkflowCode } from './parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

describe('Edge Case Roundtrip Tests', () => {
	describe('Edge Case 1: .input(n) - Connect to specific input index', () => {
		it('should roundtrip a workflow with specific input index connections', () => {
			const originalJson: WorkflowJSON = {
				id: 'input-index-test',
				name: 'Input Index Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'node-a',
						name: 'Source A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, -100],
						parameters: {},
					},
					{
						id: 'node-b',
						name: 'Source B',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 100],
						parameters: {},
					},
					{
						id: 'merge-1',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [400, 0],
						parameters: { mode: 'combine' },
					},
				],
				connections: {
					Start: {
						main: [
							[
								{ node: 'Source A', type: 'main', index: 0 },
								{ node: 'Source B', type: 'main', index: 0 },
							],
						],
					},
					'Source A': {
						main: [[{ node: 'Merge', type: 'main', index: 0 }]], // Input 0
					},
					'Source B': {
						main: [[{ node: 'Merge', type: 'main', index: 1 }]], // Input 1
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify nodes exist
			expect(parsedJson.nodes).toHaveLength(4);

			// Verify Source A connects to Merge input 0
			const sourceAConn = parsedJson.connections['Source A'];
			expect(sourceAConn?.main[0]?.[0]?.node).toBe('Merge');
			expect(sourceAConn?.main[0]?.[0]?.index).toBe(0);

			// Verify Source B connects to Merge input 1
			const sourceBConn = parsedJson.connections['Source B'];
			expect(sourceBConn?.main[0]?.[0]?.node).toBe('Merge');
			expect(sourceBConn?.main[0]?.[0]?.index).toBe(1);
		});
	});

	describe('Edge Case 2: Fan-out Within Branches', () => {
		it('should roundtrip IF with fan-out in true branch', () => {
			const originalJson: WorkflowJSON = {
				id: 'fanout-branch-test',
				name: 'Fan-out Branch Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'if-1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'true-a',
						name: 'True A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'true-b',
						name: 'True B',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 0],
						parameters: {},
					},
					{
						id: 'false-1',
						name: 'False Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'IF', type: 'main', index: 0 }]],
					},
					IF: {
						main: [
							// True branch (output 0) fans out to both True A and True B
							[
								{ node: 'True A', type: 'main', index: 0 },
								{ node: 'True B', type: 'main', index: 0 },
							],
							// False branch (output 1)
							[{ node: 'False Handler', type: 'main', index: 0 }],
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify IF true branch has 2 connections (fan-out)
			const ifConns = parsedJson.connections['IF'];
			expect(ifConns?.main[0]).toHaveLength(2);
			expect(ifConns?.main[0]?.map((c) => c.node).sort()).toEqual(['True A', 'True B']);

			// Verify false branch has 1 connection
			expect(ifConns?.main[1]).toHaveLength(1);
			expect(ifConns?.main[1]?.[0]?.node).toBe('False Handler');
		});
	});

	describe('Edge Case 4: Branch Convergence', () => {
		it('should roundtrip both IF branches converging to same node', () => {
			const originalJson: WorkflowJSON = {
				id: 'convergence-test',
				name: 'Convergence Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'if-1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'true-1',
						name: 'True Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'false-1',
						name: 'False Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
					{
						id: 'convergence-1',
						name: 'Convergence',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [600, 0],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'IF', type: 'main', index: 0 }]],
					},
					IF: {
						main: [
							[{ node: 'True Handler', type: 'main', index: 0 }],
							[{ node: 'False Handler', type: 'main', index: 0 }],
						],
					},
					'True Handler': {
						main: [[{ node: 'Convergence', type: 'main', index: 0 }]],
					},
					'False Handler': {
						main: [[{ node: 'Convergence', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify node count (should not duplicate Convergence)
			expect(parsedJson.nodes).toHaveLength(5);

			// Both branches converge to same node
			expect(parsedJson.connections['True Handler']?.main[0]?.[0]?.node).toBe('Convergence');
			expect(parsedJson.connections['False Handler']?.main[0]?.[0]?.node).toBe('Convergence');
		});
	});

	describe('Edge Case 5: Cycle/Loop Connections', () => {
		it('should roundtrip workflow with loop back connection', () => {
			const originalJson: WorkflowJSON = {
				id: 'loop-test',
				name: 'Loop Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'check-1',
						name: 'Check Status',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 0],
						parameters: { url: 'https://api.example.com/status' },
					},
					{
						id: 'if-1',
						name: 'Is Done',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [400, 0],
						parameters: {},
					},
					{
						id: 'wait-1',
						name: 'Wait',
						type: 'n8n-nodes-base.wait',
						typeVersion: 1.1,
						position: [600, 100],
						parameters: { amount: 30, unit: 'seconds' },
					},
					{
						id: 'result-1',
						name: 'Get Result',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [600, -100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'Check Status', type: 'main', index: 0 }]],
					},
					'Check Status': {
						main: [[{ node: 'Is Done', type: 'main', index: 0 }]],
					},
					'Is Done': {
						main: [
							[{ node: 'Get Result', type: 'main', index: 0 }], // True - done
							[{ node: 'Wait', type: 'main', index: 0 }], // False - not done
						],
					},
					Wait: {
						main: [[{ node: 'Check Status', type: 'main', index: 0 }]], // Loop back
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify the loop back connection
			expect(parsedJson.connections['Wait']?.main[0]?.[0]?.node).toBe('Check Status');
		});
	});

	describe('Edge Case 6: Sparse Switch Cases', () => {
		it('should roundtrip switch with non-sequential cases', () => {
			const originalJson: WorkflowJSON = {
				id: 'sparse-switch-test',
				name: 'Sparse Switch Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'switch-1',
						name: 'Router',
						type: 'n8n-nodes-base.switch',
						typeVersion: 3,
						position: [200, 0],
						parameters: { mode: 'rules' },
					},
					{
						id: 'case-0',
						name: 'Case 0',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'case-3',
						name: 'Case 3',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'Router', type: 'main', index: 0 }]],
					},
					Router: {
						main: [
							[{ node: 'Case 0', type: 'main', index: 0 }], // Output 0
							[], // Output 1 - empty
							[], // Output 2 - empty
							[{ node: 'Case 3', type: 'main', index: 0 }], // Output 3
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			const switchConns = parsedJson.connections['Router']?.main;

			// Output 0 connects to Case 0
			expect(switchConns?.[0]?.[0]?.node).toBe('Case 0');

			// Outputs 1 and 2 should be empty or undefined
			expect(switchConns?.[1] ?? []).toHaveLength(0);
			expect(switchConns?.[2] ?? []).toHaveLength(0);

			// Output 3 connects to Case 3
			expect(switchConns?.[3]?.[0]?.node).toBe('Case 3');
		});
	});

	describe('Edge Case 7: Single-Branch IF', () => {
		it('should roundtrip IF with only true branch', () => {
			const originalJson: WorkflowJSON = {
				id: 'single-branch-test',
				name: 'Single Branch Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'if-1',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'true-1',
						name: 'True Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 0],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'IF', type: 'main', index: 0 }]],
					},
					IF: {
						main: [
							[{ node: 'True Handler', type: 'main', index: 0 }], // True branch
							[], // False branch - empty
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			const ifConns = parsedJson.connections['IF']?.main;

			// True branch connected
			expect(ifConns?.[0]?.[0]?.node).toBe('True Handler');

			// False branch empty
			expect(ifConns?.[1] ?? []).toHaveLength(0);
		});
	});

	describe('Edge Case 8: Multiple Triggers to Shared Nodes', () => {
		it('should roundtrip workflow with multiple triggers to same node', () => {
			const originalJson: WorkflowJSON = {
				id: 'multi-trigger-test',
				name: 'Multi Trigger Test',
				nodes: [
					{
						id: 'manual-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'schedule-1',
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1.1,
						position: [0, 200],
						parameters: {},
					},
					{
						id: 'shared-1',
						name: 'Shared Node',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 100],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Shared Node', type: 'main', index: 0 }]],
					},
					'Schedule Trigger': {
						main: [[{ node: 'Shared Node', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Both triggers connect to Shared Node
			expect(parsedJson.connections['Manual Trigger']?.main[0]?.[0]?.node).toBe('Shared Node');
			expect(parsedJson.connections['Schedule Trigger']?.main[0]?.[0]?.node).toBe('Shared Node');

			// Shared Node should appear only once
			const sharedNodes = parsedJson.nodes.filter((n) => n.name === 'Shared Node');
			expect(sharedNodes).toHaveLength(1);
		});
	});

	describe('Edge Case 9: Multi-Output Nodes', () => {
		it('should roundtrip node with multiple output connections', () => {
			const originalJson: WorkflowJSON = {
				id: 'multi-output-test',
				name: 'Multi Output Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'classifier-1',
						name: 'Classifier',
						type: '@n8n/n8n-nodes-langchain.textClassifier',
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'cat-a',
						name: 'Category A',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'cat-b',
						name: 'Category B',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 0],
						parameters: {},
					},
					{
						id: 'cat-c',
						name: 'Category C',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'Classifier', type: 'main', index: 0 }]],
					},
					Classifier: {
						main: [
							[{ node: 'Category A', type: 'main', index: 0 }], // Output 0
							[{ node: 'Category B', type: 'main', index: 0 }], // Output 1
							[{ node: 'Category C', type: 'main', index: 0 }], // Output 2
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			const classifierConns = parsedJson.connections['Classifier']?.main;
			expect(classifierConns?.[0]?.[0]?.node).toBe('Category A');
			expect(classifierConns?.[1]?.[0]?.node).toBe('Category B');
			expect(classifierConns?.[2]?.[0]?.node).toBe('Category C');
		});
	});

	describe('Edge Case 10: SplitInBatches Loop', () => {
		it('should roundtrip split in batches with loop back', () => {
			const originalJson: WorkflowJSON = {
				id: 'sib-loop-test',
				name: 'SplitInBatches Loop Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'sib-1',
						name: 'Split In Batches',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [200, 0],
						parameters: { batchSize: 10 },
					},
					{
						id: 'process-1',
						name: 'Process Item',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
					{
						id: 'done-1',
						name: 'Done',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'Split In Batches', type: 'main', index: 0 }]],
					},
					'Split In Batches': {
						main: [
							[{ node: 'Done', type: 'main', index: 0 }], // Output 0 - done
							[{ node: 'Process Item', type: 'main', index: 0 }], // Output 1 - each
						],
					},
					'Process Item': {
						main: [[{ node: 'Split In Batches', type: 'main', index: 0 }]], // Loop back
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify loop back
			expect(parsedJson.connections['Process Item']?.main[0]?.[0]?.node).toBe('Split In Batches');

			// Verify done/each connections
			const sibConns = parsedJson.connections['Split In Batches']?.main;
			expect(sibConns?.[0]?.[0]?.node).toBe('Done');
			expect(sibConns?.[1]?.[0]?.node).toBe('Process Item');
		});
	});

	describe('Edge Case 12: Error Output Connections', () => {
		it('should roundtrip workflow with error output', () => {
			const originalJson: WorkflowJSON = {
				id: 'error-output-test',
				name: 'Error Output Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'http-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
						onError: 'continueErrorOutput',
					},
					{
						id: 'success-1',
						name: 'Success Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, -100],
						parameters: {},
					},
					{
						id: 'error-1',
						name: 'Error Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [
							[{ node: 'Success Handler', type: 'main', index: 0 }], // Output 0 - success
							[{ node: 'Error Handler', type: 'main', index: 0 }], // Output 1 - error
						],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			const httpConns = parsedJson.connections['HTTP Request']?.main;
			expect(httpConns?.[0]?.[0]?.node).toBe('Success Handler');
			expect(httpConns?.[1]?.[0]?.node).toBe('Error Handler');

			// Verify onError setting is preserved
			const httpNode = parsedJson.nodes.find((n) => n.name === 'HTTP Request');
			expect(httpNode?.onError).toBe('continueErrorOutput');
		});
	});

	describe('Edge Case 13: Subnode Connections', () => {
		it('should roundtrip AI agent with subnodes', () => {
			const originalJson: WorkflowJSON = {
				id: 'subnode-test',
				name: 'Subnode Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [400, 0],
						parameters: { promptType: 'define', text: 'You are helpful' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 200],
						parameters: { model: 'gpt-4' },
					},
					{
						id: 'tool-1',
						name: 'HTTP Tool',
						type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						typeVersion: 1.1,
						position: [200, 400],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
					'HTTP Tool': {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// Verify AI connection types
			expect(parsedJson.connections['OpenAI Model']?.ai_languageModel?.[0]?.[0]?.node).toBe(
				'AI Agent',
			);
			expect(parsedJson.connections['HTTP Tool']?.ai_tool?.[0]?.[0]?.node).toBe('AI Agent');
		});
	});

	describe('Edge Case: Apostrophes in single-quoted output strings', () => {
		it('should handle English contractions in single-quoted strings', () => {
			const code = `const t = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [0, 0] },
  output: [{}]
});

const n = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process', parameters: {}, position: [200, 0] },
  output: [{ text: 'I\\'ve arrived and it\\'s great' }]
});

export default workflow('test', 'Test').add(t.to(n));`;
			const result = parseWorkflowCode(code);
			expect(result.nodes).toHaveLength(2);
		});

		it('should escape unescaped contractions in single-quoted output strings', () => {
			// This simulates AI-generated code with unescaped contractions
			const code = `const t = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [0, 0] },
  output: [{}]
});

const n = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process', parameters: {}, position: [200, 0] },
  output: [{ text: 'I've arrived and it's great' }]
});

export default workflow('test', 'Test').add(t.to(n));`;
			const result = parseWorkflowCode(code);
			expect(result.nodes).toHaveLength(2);
		});

		it('should handle multiple contractions in one string', () => {
			const code = `const t = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [0, 0] },
  output: [{}]
});

const n = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process', parameters: {}, position: [200, 0] },
  output: [{ text: 'They don't know what they're doing' }]
});

export default workflow('test', 'Test').add(t.to(n));`;
			const result = parseWorkflowCode(code);
			expect(result.nodes).toHaveLength(2);
		});
	});

	describe('Edge Case 14: Duplicate Node Names', () => {
		it('should roundtrip workflow preserving unique node names', () => {
			// Note: Workflows should already have unique names when loaded
			// This test verifies we don't accidentally create duplicates
			const originalJson: WorkflowJSON = {
				id: 'unique-names-test',
				name: 'Unique Names Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'set-1',
						name: 'Process',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: {},
					},
					{
						id: 'set-2',
						name: 'Process 1', // Already unique
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [400, 0],
						parameters: {},
					},
				],
				connections: {
					Start: {
						main: [[{ node: 'Process', type: 'main', index: 0 }]],
					},
					Process: {
						main: [[{ node: 'Process 1', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateWorkflowCode(originalJson);
			const parsedJson = parseWorkflowCode(code);

			// All names should be unique
			const names = parsedJson.nodes.map((n) => n.name);
			expect(new Set(names).size).toBe(names.length);

			// Verify connections work correctly
			expect(parsedJson.connections['Process']?.main[0]?.[0]?.node).toBe('Process 1');
		});
	});
});
