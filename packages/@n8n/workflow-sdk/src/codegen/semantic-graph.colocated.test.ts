import { buildSemanticGraph } from './semantic-graph';
import type { WorkflowJSON } from '../types/base';

describe('buildSemanticGraph', () => {
	describe('findDisconnectedRoots', () => {
		it('identifies disconnected self-loop nodes as additional roots', () => {
			// Workflow with:
			// - Connected: Trigger -> Loop Over Items (with Replace Me in between)
			// - Disconnected: Loop Over Items1 with self-loop on "each" output
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Test Disconnected',
				nodes: [
					{
						id: '1',
						name: 'When clicking Execute workflow',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Loop Over Items',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [224, 0],
						parameters: { options: {} },
					},
					{
						id: '3',
						name: 'Replace Me',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [448, 0],
						parameters: {},
					},
					// Disconnected node with self-loop
					{
						id: '4',
						name: 'Loop Over Items1',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 224],
						parameters: { options: {} },
					},
				],
				connections: {
					'When clicking Execute workflow': {
						main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]],
					},
					'Loop Over Items': {
						main: [
							[{ node: 'Replace Me', type: 'main', index: 0 }],
							[{ node: 'Replace Me', type: 'main', index: 0 }],
						],
					},
					'Replace Me': {
						main: [[{ node: 'Loop Over Items', type: 'main', index: 0 }]],
					},
					// Self-loop: each output connects back to itself
					'Loop Over Items1': {
						main: [
							[], // done output - empty
							[{ node: 'Loop Over Items1', type: 'main', index: 0 }], // each output -> self
						],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);

			// Should have 2 roots:
			// 1. The trigger
			// 2. The disconnected Loop Over Items1 (self-loop means it has incoming, but not reachable from trigger)
			expect(graph.roots).toHaveLength(2);
			expect(graph.roots).toContain('When clicking Execute workflow');
			expect(graph.roots).toContain('Loop Over Items1');
		});

		it('identifies entry points for mutual cycle between disconnected nodes', () => {
			// Two disconnected nodes that form a mutual cycle
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Test Mutual Cycle',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Connected Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
					// Disconnected mutual cycle
					{
						id: '3',
						name: 'Loop3',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 200],
						parameters: { options: {} },
					},
					{
						id: '4',
						name: 'Loop4',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [200, 200],
						parameters: { options: {} },
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Connected Node', type: 'main', index: 0 }]],
					},
					// Loop3 done -> self, each -> Loop4
					Loop3: {
						main: [
							[{ node: 'Loop3', type: 'main', index: 0 }],
							[{ node: 'Loop4', type: 'main', index: 0 }],
						],
					},
					// Loop4 done -> Loop3, each -> Loop3
					Loop4: {
						main: [
							[{ node: 'Loop3', type: 'main', index: 0 }],
							[{ node: 'Loop3', type: 'main', index: 0 }],
						],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);

			// Should have 2 roots:
			// 1. The trigger
			// 2. One entry point for the mutual cycle (either Loop3 or Loop4)
			expect(graph.roots).toHaveLength(2);
			expect(graph.roots).toContain('Trigger');
			// At least one of Loop3/Loop4 should be a root (the entry point to the cycle)
			const hasCycleEntry = graph.roots.includes('Loop3') || graph.roots.includes('Loop4');
			expect(hasCycleEntry).toBe(true);
		});

		it('does not add subnodes as disconnected roots', () => {
			// AI workflow where subnode is technically disconnected but should not be a root
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Test AI Subnode',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0],
						parameters: {},
					},
					{
						id: '3',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 200],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					// AI subnode connection (not "main" type)
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);

			// Should only have 1 root (the trigger)
			// The AI subnode should NOT be added as a root
			expect(graph.roots).toHaveLength(1);
			expect(graph.roots).toContain('Trigger');
			expect(graph.roots).not.toContain('OpenAI Model');
		});

		it('handles complex workflow with multiple disconnected components', () => {
			// This tests the real fixture pattern from 1.json
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Multiple Disconnected',
				nodes: [
					// Connected component
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Connected1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
					// Disconnected component 1: self-loop
					{
						id: '3',
						name: 'Disconnected1',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 200],
						parameters: { options: {} },
					},
					// Disconnected component 2: two-node chain with cycle
					{
						id: '4',
						name: 'Disconnected2A',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 400],
						parameters: { options: {} },
					},
					{
						id: '5',
						name: 'Disconnected2B',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 400],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Connected1', type: 'main', index: 0 }]],
					},
					// Self-loop on both outputs
					Disconnected1: {
						main: [
							[{ node: 'Disconnected1', type: 'main', index: 0 }],
							[{ node: 'Disconnected1', type: 'main', index: 0 }],
						],
					},
					// Chain with cycle back
					Disconnected2A: {
						main: [[], [{ node: 'Disconnected2B', type: 'main', index: 0 }]],
					},
					Disconnected2B: {
						main: [[{ node: 'Disconnected2A', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);

			// Should have 3 roots:
			// 1. Trigger
			// 2. Disconnected1 (self-loop, but no incoming from outside)
			// 3. Disconnected2A (entry point for the Disconnected2A <-> Disconnected2B cycle)
			expect(graph.roots).toHaveLength(3);
			expect(graph.roots).toContain('Trigger');
			expect(graph.roots).toContain('Disconnected1');
			expect(graph.roots).toContain('Disconnected2A');
			// Disconnected2B should NOT be a root (it has incoming from Disconnected2A)
			expect(graph.roots).not.toContain('Disconnected2B');
		});
	});

	describe('onError output handling', () => {
		it('names error output as "error" when node has onError: continueErrorOutput', () => {
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Test onError',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: { options: {} },
						onError: 'continueErrorOutput',
					},
					{
						id: '3',
						name: 'Success Handler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 0],
						parameters: {},
					},
					{
						id: '4',
						name: 'Error Handler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 200],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
					'Edit Fields': {
						main: [
							[{ node: 'Success Handler', type: 'main', index: 0 }], // output 0: success
							[{ node: 'Error Handler', type: 'main', index: 0 }], // output 1: error
						],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);
			const editFieldsNode = graph.nodes.get('Edit Fields');

			expect(editFieldsNode).toBeDefined();
			// Should have "output0" for success and "error" for error output
			expect(editFieldsNode!.outputs.has('output0')).toBe(true);
			expect(editFieldsNode!.outputs.has('error')).toBe(true);

			// Verify the connections
			const successOutput = editFieldsNode!.outputs.get('output0');
			const errorOutput = editFieldsNode!.outputs.get('error');

			expect(successOutput).toHaveLength(1);
			expect(successOutput![0].target).toBe('Success Handler');

			expect(errorOutput).toHaveLength(1);
			expect(errorOutput![0].target).toBe('Error Handler');
		});

		it('does not name outputs as error when node has no onError setting', () => {
			const json: WorkflowJSON = {
				id: 'test',
				name: 'Test no onError',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Edit Fields',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 0],
						parameters: { options: {} },
						// No onError setting
					},
					{
						id: '3',
						name: 'Next Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [400, 0],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
					},
					'Edit Fields': {
						main: [[{ node: 'Next Node', type: 'main', index: 0 }]],
					},
				},
				settings: {},
			};

			const graph = buildSemanticGraph(json);
			const editFieldsNode = graph.nodes.get('Edit Fields');

			expect(editFieldsNode).toBeDefined();
			// Should have "output0" only, no "error"
			expect(editFieldsNode!.outputs.has('output0')).toBe(true);
			expect(editFieldsNode!.outputs.has('error')).toBe(false);
		});
	});
});
