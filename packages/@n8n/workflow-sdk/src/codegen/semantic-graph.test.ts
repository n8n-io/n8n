import { describe, it, expect } from '@jest/globals';

import { buildSemanticGraph, semanticGraphToWorkflowJSON } from './semantic-graph';
import type { WorkflowJSON } from '../types/base';

describe('semantic-graph', () => {
	describe('buildSemanticGraph', () => {
		it('creates nodes for all workflow nodes', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 0],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			expect(graph.nodes.size).toBe(2);
			expect(graph.nodes.has('Trigger')).toBe(true);
			expect(graph.nodes.has('Process')).toBe(true);
		});

		it('parses simple linear connection', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 0],
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Process', type: 'main', index: 0 }]],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const trigger = graph.nodes.get('Trigger')!;
			const process = graph.nodes.get('Process')!;

			// Trigger has output0 → Process
			expect(trigger.outputs.get('output0')).toEqual([
				{ target: 'Process', targetInputSlot: 'input0' },
			]);

			// Process has input from Trigger
			expect(process.inputSources.get('input0')).toEqual([
				{ from: 'Trigger', outputSlot: 'output0' },
			]);
		});

		it('uses semantic names for IF node outputs', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ id: '2', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [100, 0] },
					{
						id: '3',
						name: 'TrueHandler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '4',
						name: 'FalseHandler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'IF', type: 'main', index: 0 }]],
					},
					IF: {
						main: [
							[{ node: 'TrueHandler', type: 'main', index: 0 }],
							[{ node: 'FalseHandler', type: 'main', index: 0 }],
						],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const ifNode = graph.nodes.get('IF')!;

			// IF output 0 should be 'trueBranch'
			expect(ifNode.outputs.get('trueBranch')).toEqual([
				{ target: 'TrueHandler', targetInputSlot: 'input0' },
			]);

			// IF output 1 should be 'falseBranch'
			expect(ifNode.outputs.get('falseBranch')).toEqual([
				{ target: 'FalseHandler', targetInputSlot: 'input0' },
			]);
		});

		it('uses semantic names for Merge node inputs', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Source1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, -50],
					},
					{
						id: '2',
						name: 'Source2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 50],
					},
					{
						id: '3',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [100, 0],
						parameters: { numberInputs: 2 },
					},
				],
				connections: {
					Source1: {
						main: [[{ node: 'Merge', type: 'main', index: 0 }]],
					},
					Source2: {
						main: [[{ node: 'Merge', type: 'main', index: 1 }]],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const merge = graph.nodes.get('Merge')!;

			// Merge input 0 should be 'branch0'
			expect(merge.inputSources.get('branch0')).toEqual([
				{ from: 'Source1', outputSlot: 'output0' },
			]);

			// Merge input 1 should be 'branch1'
			expect(merge.inputSources.get('branch1')).toEqual([
				{ from: 'Source2', outputSlot: 'output0' },
			]);
		});

		it('uses semantic names for SplitInBatches outputs', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'SplitInBatches',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [100, 0],
					},
					{
						id: '3',
						name: 'DoneHandler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '4',
						name: 'LoopBody',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]],
					},
					SplitInBatches: {
						main: [
							[{ node: 'DoneHandler', type: 'main', index: 0 }],
							[{ node: 'LoopBody', type: 'main', index: 0 }],
						],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const sib = graph.nodes.get('SplitInBatches')!;

			// SplitInBatches output 0 should be 'done'
			expect(sib.outputs.get('done')).toEqual([
				{ target: 'DoneHandler', targetInputSlot: 'input0' },
			]);

			// SplitInBatches output 1 should be 'loop'
			expect(sib.outputs.get('loop')).toEqual([{ target: 'LoopBody', targetInputSlot: 'input0' }]);
		});

		it('handles fan-out (one source to multiple targets)', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Target1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, -50],
					},
					{
						id: '3',
						name: 'Target2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 50],
					},
				],
				connections: {
					Trigger: {
						main: [
							[
								{ node: 'Target1', type: 'main', index: 0 },
								{ node: 'Target2', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const trigger = graph.nodes.get('Trigger')!;

			// Trigger output0 should connect to both targets
			expect(trigger.outputs.get('output0')).toHaveLength(2);
			expect(trigger.outputs.get('output0')).toContainEqual({
				target: 'Target1',
				targetInputSlot: 'input0',
			});
			expect(trigger.outputs.get('output0')).toContainEqual({
				target: 'Target2',
				targetInputSlot: 'input0',
			});
		});

		it('identifies trigger nodes as roots', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 0],
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Process', type: 'main', index: 0 }]],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			expect(graph.roots).toContain('Trigger');
			expect(graph.roots).not.toContain('Process');
		});

		it('identifies orphan nodes as roots', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Orphan',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [100, 100],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			// Both should be roots (trigger + orphan)
			expect(graph.roots).toContain('Trigger');
			expect(graph.roots).toContain('Orphan');
		});

		it('parses AI subnode connections', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [-100, 50],
					},
					{
						id: '3',
						name: 'Tool',
						type: '@n8n/n8n-nodes-langchain.toolSerpApi',
						typeVersion: 1,
						position: [-100, 100],
					},
				],
				connections: {
					Model: {
						ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
					},
					Tool: {
						ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const graph = buildSemanticGraph(json);

			const agent = graph.nodes.get('Agent')!;

			expect(agent.subnodes).toHaveLength(2);
			expect(agent.subnodes).toContainEqual({
				connectionType: 'ai_languageModel',
				subnodeName: 'Model',
				index: 0,
			});
			expect(agent.subnodes).toContainEqual({
				connectionType: 'ai_tool',
				subnodeName: 'Tool',
				index: 0,
			});
		});

		it('initializes annotations to default values', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			const node = graph.nodes.get('Process')!;

			expect(node.annotations.isTrigger).toBe(false);
			expect(node.annotations.isCycleTarget).toBe(false);
			expect(node.annotations.isConvergencePoint).toBe(false);
		});

		it('marks trigger nodes in annotations', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'WebhookTrigger',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [0, 100],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			expect(graph.nodes.get('Trigger')!.annotations.isTrigger).toBe(true);
			expect(graph.nodes.get('WebhookTrigger')!.annotations.isTrigger).toBe(true);
		});

		it('handles empty workflow', () => {
			const json: WorkflowJSON = {
				name: 'Empty',
				nodes: [],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			expect(graph.nodes.size).toBe(0);
			expect(graph.roots).toHaveLength(0);
		});

		it('parses error type connections', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [0, 0],
						onError: 'continueErrorOutput',
					},
					{
						id: '2',
						name: 'ErrorHandler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 100],
					},
				],
				connections: {
					HTTP: {
						error: [[{ node: 'ErrorHandler', type: 'main', index: 0 }]],
					},
				},
			};

			const graph = buildSemanticGraph(json);
			const http = graph.nodes.get('HTTP')!;

			expect(http.outputs.get('error')).toEqual([
				{ target: 'ErrorHandler', targetInputSlot: 'input0' },
			]);
		});

		it('normalizes string typeVersion to number', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: '2' as unknown as number,
						position: [0, 0],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);
			const node = graph.nodes.get('Node')!;

			expect(node.json.typeVersion).toBe(2);
			expect(typeof node.json.typeVersion).toBe('number');
		});

		it('handles duplicate node names with unique graph keys', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
					},
				],
				connections: {},
			};

			const graph = buildSemanticGraph(json);

			// Both nodes should exist with unique keys
			expect(graph.nodes.size).toBe(2);
			expect(graph.nodes.has('HTTP')).toBe(true);
			expect(graph.nodes.has('HTTP 2')).toBe(true);
		});

		it('normalizes flat tuple connections to object format', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					Trigger: {
						main: [['Process', 'main', 0] as unknown as null],
					},
				},
			};

			const graph = buildSemanticGraph(json);
			const trigger = graph.nodes.get('Trigger')!;

			expect(trigger.outputs.get('output0')).toEqual([
				{ target: 'Process', targetInputSlot: 'input0' },
			]);
		});

		it('does not mutate the input WorkflowJSON', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Node',
						type: 'n8n-nodes-base.noOp',
						typeVersion: '2' as unknown as number,
						position: [0, 0],
					},
				],
				connections: {
					Node: {
						main: [['Target', 'main', 0] as unknown as null],
					},
				},
			};
			const originalConnections = JSON.stringify(json.connections);
			const originalTypeVersion = json.nodes[0].typeVersion;

			buildSemanticGraph(json);

			expect(json.nodes[0].typeVersion).toBe(originalTypeVersion); // still string
			expect(JSON.stringify(json.connections)).toBe(originalConnections); // still flat tuple
		});
	});

	describe('semanticGraphToWorkflowJSON', () => {
		/** Helper: round-trip JSON through semantic graph and back */
		function roundTrip(json: WorkflowJSON): WorkflowJSON {
			const graph = buildSemanticGraph(json);
			return semanticGraphToWorkflowJSON(graph, json.name);
		}

		it('round-trips a linear chain', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Process',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
				},
			};

			const result = roundTrip(json);

			expect(result.nodes).toHaveLength(2);
			expect(result.connections.Trigger.main[0]).toEqual([
				{ node: 'Process', type: 'main', index: 0 },
			]);
		});

		it('round-trips IF node with two branches', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{ id: '1', name: 'IF', type: 'n8n-nodes-base.if', typeVersion: 2, position: [0, 0] },
					{
						id: '2',
						name: 'True',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '3',
						name: 'False',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					IF: {
						main: [
							[{ node: 'True', type: 'main', index: 0 }],
							[{ node: 'False', type: 'main', index: 0 }],
						],
					},
				},
			};

			const result = roundTrip(json);

			expect(result.connections.IF.main[0]).toEqual([{ node: 'True', type: 'main', index: 0 }]);
			expect(result.connections.IF.main[1]).toEqual([{ node: 'False', type: 'main', index: 0 }]);
		});

		it('round-trips Merge node with multiple inputs', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Source1',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, -50],
					},
					{
						id: '2',
						name: 'Source2',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [0, 50],
					},
					{
						id: '3',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [200, 0],
						parameters: { numberInputs: 2 },
					},
				],
				connections: {
					Source1: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
					Source2: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
				},
			};

			const result = roundTrip(json);

			expect(result.connections.Source1.main[0]).toEqual([
				{ node: 'Merge', type: 'main', index: 0 },
			]);
			expect(result.connections.Source2.main[0]).toEqual([
				{ node: 'Merge', type: 'main', index: 1 },
			]);
		});

		it('round-trips SplitInBatches with done/loop outputs', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'SIB',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Done',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '3',
						name: 'Loop',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					SIB: {
						main: [
							[{ node: 'Done', type: 'main', index: 0 }],
							[{ node: 'Loop', type: 'main', index: 0 }],
						],
					},
				},
			};

			const result = roundTrip(json);

			expect(result.connections.SIB.main[0]).toEqual([{ node: 'Done', type: 'main', index: 0 }]);
			expect(result.connections.SIB.main[1]).toEqual([{ node: 'Loop', type: 'main', index: 0 }]);
		});

		it('round-trips AI subnodes', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '3',
						name: 'Tool',
						type: '@n8n/n8n-nodes-langchain.toolSerpApi',
						typeVersion: 1,
						position: [200, 200],
					},
				],
				connections: {
					Model: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
					Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
				},
			};

			const result = roundTrip(json);

			expect(result.connections.Model.ai_languageModel[0]).toEqual([
				{ node: 'Agent', type: 'ai_languageModel', index: 0 },
			]);
			expect(result.connections.Tool.ai_tool[0]).toEqual([
				{ node: 'Agent', type: 'ai_tool', index: 0 },
			]);
			// AI-only nodes should NOT have spurious 'main' key
			expect(result.connections.Model.main).toBeUndefined();
			expect(result.connections.Tool.main).toBeUndefined();
		});

		it('round-trips error connections', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [0, 0],
						onError: 'continueErrorOutput' as const,
					},
					{
						id: '2',
						name: 'Success',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '3',
						name: 'ErrorHandler',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					HTTP: {
						main: [
							[{ node: 'Success', type: 'main', index: 0 }],
							[{ node: 'ErrorHandler', type: 'main', index: 0 }],
						],
					},
				},
			};

			const result = roundTrip(json);

			// Regular output at index 0, error output at index 1
			expect(result.connections.HTTP.main[0]).toEqual([
				{ node: 'Success', type: 'main', index: 0 },
			]);
			expect(result.connections.HTTP.main[1]).toEqual([
				{ node: 'ErrorHandler', type: 'main', index: 0 },
			]);
		});

		it('round-trips fan-out connections', () => {
			const json: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ id: '2', name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [200, -50] },
					{ id: '3', name: 'B', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [200, 50] },
				],
				connections: {
					Trigger: {
						main: [
							[
								{ node: 'A', type: 'main', index: 0 },
								{ node: 'B', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			const result = roundTrip(json);

			expect(result.connections.Trigger.main[0]).toHaveLength(2);
			expect(result.connections.Trigger.main[0]).toContainEqual({
				node: 'A',
				type: 'main',
				index: 0,
			});
			expect(result.connections.Trigger.main[0]).toContainEqual({
				node: 'B',
				type: 'main',
				index: 0,
			});
		});

		it('round-trips empty workflow', () => {
			const json: WorkflowJSON = { name: 'Empty', nodes: [], connections: {} };

			const result = roundTrip(json);

			expect(result.nodes).toHaveLength(0);
			expect(result.connections).toEqual({});
		});
	});
});
