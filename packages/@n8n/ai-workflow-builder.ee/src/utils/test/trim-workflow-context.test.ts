import type { INode } from 'n8n-workflow';

import { createNode, createWorkflow } from '../../../test/test-utils';
import type { SimpleWorkflow } from '../../types/workflow';
import { trimWorkflowJSON } from '../trim-workflow-context';

describe('trimWorkflowJSON', () => {
	describe('Small workflows', () => {
		it('should not modify small workflows that fit within token limits', () => {
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: {
						url: 'https://api.example.com/endpoint',
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			// Workflow should be unchanged
			expect(result).toEqual(workflow);
			expect(result.nodes[0].parameters).toEqual(workflow.nodes[0].parameters);
		});

		it('should handle empty workflows', () => {
			const workflow: SimpleWorkflow = createWorkflow([]);

			const result = trimWorkflowJSON(workflow);

			expect(result.nodes).toEqual([]);
			expect(result.connections).toEqual({});
		});

		it('should handle workflows with nodes but no parameters', () => {
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Start',
					type: 'n8n-nodes-base.start',
					parameters: {},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			expect(result).toEqual(workflow);
		});
	});

	describe('Large parameter trimming', () => {
		it('should trim large string parameters', () => {
			const largeString = 'x'.repeat(15000);
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Code Node',
					type: 'n8n-nodes-base.code',
					parameters: {
						jsCode: largeString,
						smallParam: 'keep this',
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			expect(result.nodes[0].parameters.jsCode).toBe('[Large value omitted]');
			expect(result.nodes[0].parameters.smallParam).toBe('keep this');
		});

		it('should trim large arrays', () => {
			const largeArray = new Array(5000).fill({ item: 'data' });
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Item Lists',
					type: 'n8n-nodes-base.itemLists',
					parameters: {
						items: largeArray,
						operation: 'aggregateItems',
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			expect(result.nodes[0].parameters.items).toBe('[Large array omitted]');
			expect(result.nodes[0].parameters.operation).toBe('aggregateItems');
		});

		it('should trim large objects', () => {
			const largeObject: Record<string, string> = {};
			for (let i = 0; i < 1000; i++) {
				largeObject[`key_${i}`] = `value_${i}`.repeat(20);
			}

			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Function',
					type: 'n8n-nodes-base.function',
					parameters: {
						functionCode: 'return items;',
						data: largeObject,
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			expect(result.nodes[0].parameters.data).toBe('[Large object omitted]');
			expect(result.nodes[0].parameters.functionCode).toBe('return items;');
		});

		it('should handle null and undefined parameters correctly', () => {
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Test Node',
					type: 'n8n-nodes-base.test',
					parameters: {
						nullValue: null,

						undefinedValue: undefined,
						validValue: 'test',
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			expect(result.nodes[0].parameters.nullValue).toBeNull();
			expect(result.nodes[0].parameters.undefinedValue).toBeUndefined();
			expect(result.nodes[0].parameters.validValue).toBe('test');
		});
	});

	describe('Progressive trimming', () => {
		it('should apply progressively more aggressive trimming for very large workflows', () => {
			// Create a workflow with parameters at different size levels
			const medium = 'x'.repeat(3000); // Will be kept at 10000 and 5000 threshold, trimmed at 2000
			const large = 'y'.repeat(7000); // Will be kept at 10000 threshold, trimmed at 5000
			const veryLarge = 'z'.repeat(12000); // Will be trimmed at 10000 threshold

			const nodes: INode[] = [];
			// Add many nodes to create a large workflow
			for (let i = 0; i < 20; i++) {
				nodes.push(
					createNode({
						id: `node${i}`,
						name: `Node ${i}`,
						type: 'n8n-nodes-base.code',
						parameters: {
							medium,
							large,
							veryLarge,
						},
					}),
				);
			}

			const workflow: SimpleWorkflow = createWorkflow(nodes);
			const result = trimWorkflowJSON(workflow);

			// All veryLarge and large parameters should be trimmed
			result.nodes.forEach((node) => {
				expect(node.parameters?.veryLarge).toBe('[Large value omitted]');
				expect(node.parameters?.large).toBe('[Large value omitted]');
				expect(node.parameters?.medium).toBe(medium);
			});
		});
	});

	describe('Edge cases', () => {
		it('should preserve connections', () => {
			const workflow: SimpleWorkflow = {
				name: 'Connected Workflow',
				nodes: [
					createNode({ id: 'node1', name: 'Start' }),
					createNode({ id: 'node2', name: 'End' }),
				],
				connections: {
					node1: {
						main: [[{ node: 'node2', type: 'main', index: 0 }]],
					},
				},
			};

			const result = trimWorkflowJSON(workflow);

			// Connections should be preserved
			expect(result.connections).toEqual(workflow.connections);
		});

		it('should handle workflows with mixed parameter types', () => {
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Mixed Node',
					type: 'n8n-nodes-base.mixed',
					parameters: {
						stringValue: 'normal string',
						numberValue: 42,
						booleanValue: true,
						largeString: 'x'.repeat(15000),
						array: ['item1', 'item2'],
						objectValue: { key: 'value' },
						largeArray: new Array(5000).fill('item'),
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			// Normal parameters should be preserved
			expect(result.nodes[0].parameters.stringValue).toBe('normal string');
			expect(result.nodes[0].parameters.numberValue).toBe(42);
			expect(result.nodes[0].parameters.booleanValue).toBe(true);
			expect(result.nodes[0].parameters.array).toEqual(['item1', 'item2']);
			expect(result.nodes[0].parameters.objectValue).toEqual({ key: 'value' });
			// Large parameters should be trimmed
			expect(result.nodes[0].parameters.largeString).toBe('[Large value omitted]');
			expect(result.nodes[0].parameters.largeArray).toBe('[Large array omitted]');
		});

		it('should handle deeply nested parameters', () => {
			const workflow: SimpleWorkflow = createWorkflow([
				createNode({
					id: 'node1',
					name: 'Nested Node',
					type: 'n8n-nodes-base.nested',
					parameters: {
						level1: {
							level2: {
								level3: {
									largeData: 'x'.repeat(15000),
								},
							},
						},
					},
				}),
			]);

			const result = trimWorkflowJSON(workflow);

			// The entire nested object gets evaluated as a whole
			// If the stringified nested object is too large, it gets replaced
			expect(result.nodes[0].parameters.level1).toBe('[Large object omitted]');
		});

		it('should return most aggressively trimmed version if nothing fits', () => {
			// Create an enormous workflow that won't fit even with aggressive trimming
			const nodes: INode[] = [];
			for (let i = 0; i < 1000; i++) {
				nodes.push(
					createNode({
						id: `node${i}`,
						name: `Node ${i}`,
						type: 'n8n-nodes-base.code',
						parameters: {
							data1: 'x'.repeat(2000),
							data2: 'y'.repeat(2000),
							data3: 'z'.repeat(2000),
						},
					}),
				);
			}

			const workflow: SimpleWorkflow = createWorkflow(nodes);
			const result = trimWorkflowJSON(workflow);

			// All large parameters should be trimmed with the most aggressive threshold (1000)
			result.nodes.forEach((node) => {
				expect(node.parameters?.data1).toBe('[Large value omitted]');
				expect(node.parameters?.data2).toBe('[Large value omitted]');
				expect(node.parameters?.data3).toBe('[Large value omitted]');
			});
		});
	});
});
