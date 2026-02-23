import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import { evaluateNodes } from './nodes';

describe('evaluateNodes', () => {
	const mockNodeTypes: INodeTypeDescription[] = [
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.manualTrigger',
			displayName: 'Manual Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.executeWorkflowTrigger',
			displayName: 'Execute Workflow Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
			maxNodes: 1,
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			group: ['transform'],
			inputs: ['main'],
			outputs: ['main'],
		}),
	];

	describe('basic validation', () => {
		it('should detect workflow with no nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);

			expect(result.violations).toContainEqual(
				expect.objectContaining({ description: 'Workflow has no nodes' }),
			);
		});

		it('should accept workflow with nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Valid Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);
			expect(result.violations).toEqual([]);
		});
	});

	describe('maxNodes validation', () => {
		it('should accept workflow with nodes within maxNodes limit', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Single Execute Workflow Trigger',
				nodes: [
					{
						id: '1',
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);
			expect(result.violations).toEqual([]);
		});

		it('should detect workflow exceeding maxNodes limit', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Multiple Execute Workflow Triggers',
				nodes: [
					{
						id: '1',
						name: 'Execute Workflow Trigger 1',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Execute Workflow Trigger 2',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '3',
						name: 'Code',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);
			expect(result.violations).toContainEqual(
				expect.objectContaining({
					name: 'workflow-exceeds-max-nodes-limit',
					type: 'critical',
				}),
			);
		});

		it('should include count and limit in violation description', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Multiple Execute Workflow Triggers',
				nodes: [
					{
						id: '1',
						name: 'First Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Second Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);
			const violation = result.violations.find(
				(v) => v.name === 'workflow-exceeds-max-nodes-limit',
			);
			expect(violation?.description).toContain('1'); // maxNodes limit
			expect(violation?.description).toContain('2'); // actual count
			expect(violation?.description).toContain('Execute Workflow Trigger');
		});

		it('should allow multiple nodes when maxNodes is not set', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Multiple Code Nodes',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Code 1',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: '3',
						name: 'Code 2',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
					{
						id: '4',
						name: 'Code 3',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [600, 0],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, mockNodeTypes);
			expect(result.violations).toEqual([]);
		});

		it('should validate maxNodes for different node types independently', () => {
			const nodeTypesWithMaxNodes: INodeTypeDescription[] = [
				...mockNodeTypes,
				mock<INodeTypeDescription>({
					name: 'n8n-nodes-base.limitedNode',
					displayName: 'Limited Node',
					group: ['transform'],
					inputs: ['main'],
					outputs: ['main'],
					maxNodes: 2,
				}),
			];

			const workflow = mock<SimpleWorkflow>({
				name: 'Multiple Limited Nodes',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Limited 1',
						type: 'n8n-nodes-base.limitedNode',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: '3',
						name: 'Limited 2',
						type: 'n8n-nodes-base.limitedNode',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
				],
				connections: {},
			});

			const result = evaluateNodes(workflow, nodeTypesWithMaxNodes);
			expect(result.violations).toEqual([]);

			// Now add a third limited node (exceeding maxNodes: 2)
			const workflowExceeding = mock<SimpleWorkflow>({
				name: 'Too Many Limited Nodes',
				nodes: [
					...workflow.nodes,
					{
						id: '4',
						name: 'Limited 3',
						type: 'n8n-nodes-base.limitedNode',
						parameters: {},
						typeVersion: 1,
						position: [600, 0],
					},
				],
				connections: {},
			});

			const resultExceeding = evaluateNodes(workflowExceeding, nodeTypesWithMaxNodes);
			expect(resultExceeding.violations).toContainEqual(
				expect.objectContaining({
					name: 'workflow-exceeds-max-nodes-limit',
					description: expect.stringContaining('2'),
				}),
			);
		});
	});
});
