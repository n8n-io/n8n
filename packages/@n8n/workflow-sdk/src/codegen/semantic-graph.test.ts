import { describe, it, expect } from '@jest/globals';

import { buildSemanticGraph } from './semantic-graph';
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
			});
			expect(agent.subnodes).toContainEqual({
				connectionType: 'ai_tool',
				subnodeName: 'Tool',
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
	});
});
