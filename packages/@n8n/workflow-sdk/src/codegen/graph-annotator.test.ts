import { describe, it, expect } from '@jest/globals';

import { annotateGraph } from './graph-annotator';
import { buildSemanticGraph } from './semantic-graph';
import type { WorkflowJSON } from '../types/base';

describe('graph-annotator', () => {
	describe('annotateGraph', () => {
		describe('cycle detection', () => {
			it('marks SplitInBatches loop target as cycle target', () => {
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
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]],
						},
						SplitInBatches: {
							main: [
								[], // output 0 (done) - empty
								[{ node: 'Process', type: 'main', index: 0 }], // output 1 (loop)
							],
						},
						Process: {
							main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]], // loop back
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// SplitInBatches is a cycle target (loop back connects to it)
				expect(graph.nodes.get('SplitInBatches')!.annotations.isCycleTarget).toBe(true);
				// Trigger and Process are not cycle targets
				expect(graph.nodes.get('Trigger')!.annotations.isCycleTarget).toBe(false);
				expect(graph.nodes.get('Process')!.annotations.isCycleTarget).toBe(false);
			});

			it('marks general cycle target nodes', () => {
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
							name: 'NodeA',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'NodeB',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'NodeA', type: 'main', index: 0 }]],
						},
						NodeA: {
							main: [[{ node: 'NodeB', type: 'main', index: 0 }]],
						},
						NodeB: {
							main: [[{ node: 'NodeA', type: 'main', index: 0 }]], // cycle back to NodeA
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// NodeA is the cycle target
				expect(graph.nodes.get('NodeA')!.annotations.isCycleTarget).toBe(true);
			});

			it('records cycle edges', () => {
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
							name: 'Process',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]],
						},
						SplitInBatches: {
							main: [[], [{ node: 'Process', type: 'main', index: 0 }]],
						},
						Process: {
							main: [[{ node: 'SplitInBatches', type: 'main', index: 0 }]],
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// Process → SplitInBatches is a cycle edge
				expect(graph.cycleEdges.get('Process')).toContain('SplitInBatches');
			});

			it('does not mark nodes in linear workflows as cycle targets', () => {
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
							name: 'Process1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [100, 0],
						},
						{
							id: '3',
							name: 'Process2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'Process1', type: 'main', index: 0 }]],
						},
						Process1: {
							main: [[{ node: 'Process2', type: 'main', index: 0 }]],
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				expect(graph.nodes.get('Trigger')!.annotations.isCycleTarget).toBe(false);
				expect(graph.nodes.get('Process1')!.annotations.isCycleTarget).toBe(false);
				expect(graph.nodes.get('Process2')!.annotations.isCycleTarget).toBe(false);
				expect(graph.cycleEdges.size).toBe(0);
			});
		});

		describe('convergence detection', () => {
			it('marks node as convergence point when reachable from IF branches', () => {
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
						{
							id: '5',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [300, 0],
							parameters: { numberInputs: 2 },
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
						TrueHandler: {
							main: [[{ node: 'Merge', type: 'main', index: 0 }]],
						},
						FalseHandler: {
							main: [[{ node: 'Merge', type: 'main', index: 1 }]],
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// Merge is a convergence point (reachable from both IF branches)
				expect(graph.nodes.get('Merge')!.annotations.isConvergencePoint).toBe(true);
				// Other nodes are not convergence points
				expect(graph.nodes.get('IF')!.annotations.isConvergencePoint).toBe(false);
				expect(graph.nodes.get('TrueHandler')!.annotations.isConvergencePoint).toBe(false);
				expect(graph.nodes.get('FalseHandler')!.annotations.isConvergencePoint).toBe(false);
			});

			it('marks node as convergence point when reachable from Switch cases', () => {
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
							name: 'Switch',
							type: 'n8n-nodes-base.switch',
							typeVersion: 3,
							position: [100, 0],
							parameters: { rules: { rules: [{}, {}] } },
						},
						{
							id: '3',
							name: 'Case0',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, -50],
						},
						{
							id: '4',
							name: 'Case1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 50],
						},
						{
							id: '5',
							name: 'Common',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'Switch', type: 'main', index: 0 }]],
						},
						Switch: {
							main: [
								[{ node: 'Case0', type: 'main', index: 0 }],
								[{ node: 'Case1', type: 'main', index: 0 }],
							],
						},
						Case0: {
							main: [[{ node: 'Common', type: 'main', index: 0 }]],
						},
						Case1: {
							main: [[{ node: 'Common', type: 'main', index: 0 }]],
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// Common is a convergence point
				expect(graph.nodes.get('Common')!.annotations.isConvergencePoint).toBe(true);
			});

			it('does not mark nodes in single-path workflows as convergence points', () => {
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
							name: 'Final',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
						},
					],
					connections: {
						Trigger: {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [
								[{ node: 'TrueHandler', type: 'main', index: 0 }],
								[], // false branch empty
							],
						},
						TrueHandler: {
							main: [[{ node: 'Final', type: 'main', index: 0 }]],
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// Final is only reachable from true branch, not a convergence point
				expect(graph.nodes.get('Final')!.annotations.isConvergencePoint).toBe(false);
			});
		});

		describe('combined annotations', () => {
			it('handles workflows with both cycles and convergence', () => {
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
						{
							id: '5',
							name: 'Common',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [300, 0],
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
						TrueHandler: {
							main: [[{ node: 'Common', type: 'main', index: 0 }]],
						},
						FalseHandler: {
							main: [[{ node: 'Common', type: 'main', index: 0 }]],
						},
						Common: {
							main: [[{ node: 'IF', type: 'main', index: 0 }]], // cycle back to IF
						},
					},
				};

				const graph = buildSemanticGraph(json);
				annotateGraph(graph);

				// IF is a cycle target
				expect(graph.nodes.get('IF')!.annotations.isCycleTarget).toBe(true);
				// Common is a convergence point
				expect(graph.nodes.get('Common')!.annotations.isConvergencePoint).toBe(true);
			});

			it('handles empty graph', () => {
				const json: WorkflowJSON = {
					name: 'Empty',
					nodes: [],
					connections: {},
				};

				const graph = buildSemanticGraph(json);
				// Should not throw
				expect(() => annotateGraph(graph)).not.toThrow();
			});
		});
	});
});
