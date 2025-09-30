import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import { evaluateTrigger } from './trigger';

describe('evaluateTrigger', () => {
	const mockNodeTypes: INodeTypeDescription[] = [
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.manualTrigger',
			displayName: 'Manual Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.webhookTrigger',
			displayName: 'Webhook Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.scheduleTrigger',
			displayName: 'Schedule Trigger',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			group: ['transform'],
			inputs: ['main'],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			group: ['transform'],
			inputs: ['main'],
			outputs: ['main'],
		}),
		mock<INodeTypeDescription>({
			name: 'n8n-nodes-base.set',
			displayName: 'Set',
			group: ['input'],
			inputs: ['main'],
			outputs: ['main'],
		}),
	];

	describe('basic trigger validation', () => {
		it('should detect workflow with no nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.hasTrigger).toBe(false);
			expect(result.violations).toContainEqual(
				expect.objectContaining({ description: 'Workflow has no nodes' }),
			);
			expect(result.triggerNodes).toEqual([]);
		});

		it('should detect workflow with no trigger nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'No Trigger Workflow',
				nodes: [
					{
						id: '1',
						name: 'Code',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.hasTrigger).toBe(false);
			expect(result.violations).toContainEqual(
				expect.objectContaining({
					description: 'Workflow must have at least one trigger node to start execution',
				}),
			);
			expect(result.triggerNodes).toEqual([]);
		});

		it('should accept workflow with one trigger node', () => {
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

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.hasTrigger).toBe(true);
			expect(result.violations).toEqual([]);
			expect(result.triggerNodes).toEqual(['Manual Trigger']);
		});
	});

	describe('edge cases', () => {
		it('should handle unknown node types gracefully', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Unknown Node Workflow',
				nodes: [
					{
						id: '1',
						name: 'Unknown Trigger',
						type: 'n8n-nodes-base.unknownTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			// Should still find the valid trigger
			expect(result.hasTrigger).toBe(true);
			expect(result.violations).toEqual([]);
			expect(result.triggerNodes).toEqual(['Manual Trigger']);
		});

		it('should handle mixed trigger and non-trigger nodes', () => {
			const workflow = mock<SimpleWorkflow>({
				name: 'Mixed Workflow',
				nodes: [
					{
						id: '1',
						name: 'Set Data',
						type: 'n8n-nodes-base.set',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: '2',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhookTrigger',
						parameters: {},
						typeVersion: 1,
						position: [200, 0],
					},
					{
						id: '3',
						name: 'Process',
						type: 'n8n-nodes-base.code',
						parameters: {},
						typeVersion: 1,
						position: [400, 0],
					},
					{
						id: '4',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 200],
					},
					{
						id: '5',
						name: 'HTTP Call',
						type: 'n8n-nodes-base.httpRequest',
						parameters: {},
						typeVersion: 1,
						position: [600, 0],
					},
				],
				connections: {},
			});

			const result = evaluateTrigger(workflow, mockNodeTypes);

			expect(result.hasTrigger).toBe(true);
			expect(result.triggerNodes).toEqual(['Webhook', 'Manual']);
		});
	});
});
