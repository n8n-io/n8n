import { describe, it, expect } from '@jest/globals';

import { buildSemanticGraph } from '../codegen/semantic-graph';
import { annotateGraph } from '../codegen/graph-annotator';
import { buildCompositeTree } from '../codegen/composite-builder';
import { generateDataFlowCode } from '../codegen/dataflow/dataflow-generator';
import type { WorkflowJSON } from '../types/base';

function generateFromWorkflow(json: WorkflowJSON): string {
	const graph = buildSemanticGraph(json);
	annotateGraph(graph);
	const tree = buildCompositeTree(graph);
	return generateDataFlowCode(tree, json, graph);
}

describe('dataflow-generator', () => {
	describe('generateDataFlowCode', () => {
		it('generates wrapper for empty workflow', () => {
			const json: WorkflowJSON = {
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain("workflow({ name: 'Empty Workflow' }, () => {");
			expect(code).toContain('});');
		});

		it('generates onTrigger for single trigger', () => {
			const json: WorkflowJSON = {
				name: 'Single Trigger',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain("workflow({ name: 'Single Trigger' }, () => {");
			expect(code).toContain("onTrigger({ type: 'n8n-nodes-base.manualTrigger'");
			expect(code).toContain('params: {}');
			expect(code).toContain('(items) => {');
		});

		it('generates sequential const assignments for trigger → chain', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com' },
					},
					{
						id: '3',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 0],
						parameters: {
							values: { string: [{ name: 'key', value: 'val' }] },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			// Should have trigger wrapping the chain
			expect(code).toContain("onTrigger({ type: 'n8n-nodes-base.manualTrigger'");
			// Should have .map() wrapped const assignments inside callback (per-item default)
			expect(code).toContain('const hTTP_Request = items.map((item) =>');
			expect(code).toContain("type: 'n8n-nodes-base.httpRequest'");
			expect(code).toContain('const set = hTTP_Request.map((item) =>');
			expect(code).toContain("type: 'n8n-nodes-base.set'");
		});

		it('includes name in config when it differs from default', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'My Custom Name',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'My Custom Name', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain("name: 'My Custom Name'");
		});

		it('does not include name when it matches the default', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			// The node config should not include a name property since it matches default
			// Extract the executeNode() call substring
			const nodeCallMatch = code.match(/executeNode\(\{.+?\}\)/);
			expect(nodeCallMatch).toBeTruthy();
			// The executeNode() call should not include "name:" since HTTP Request is the default
			expect(nodeCallMatch![0]).not.toContain('name:');
		});

		it('includes credentials in config', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
						credentials: {
							httpBasicAuth: { id: '1', name: 'My Auth' },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain('credentials:');
			expect(code).toContain("httpBasicAuth: { id: '1', name: 'My Auth' }");
		});

		it('includes params in config', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com', method: 'POST' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain('params:');
			expect(code).toContain("url: 'https://example.com'");
			expect(code).toContain("method: 'POST'");
		});

		it('includes version in config', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://example.com' },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			// The HTTP Request node should have version 4
			expect(code).toContain('version: 4');
		});

		it('skips sticky notes', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Sticky Note',
						type: 'n8n-nodes-base.stickyNote',
						typeVersion: 1,
						position: [100, 100],
						parameters: { content: 'This is a note' },
					},
				],
				connections: {},
			};

			const code = generateFromWorkflow(json);

			expect(code).not.toContain('stickyNote');
			expect(code).not.toContain('Sticky Note');
		});

		it('includes trigger version in onTrigger config', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [0, 0],
						parameters: { path: '/test' },
					},
				],
				connections: {},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain("type: 'n8n-nodes-base.webhook'");
			expect(code).toContain('version: 2');
			expect(code).toContain("params: { path: '/test' }");
		});

		it('includes trigger credentials in onTrigger config', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [0, 0],
						parameters: { path: '/test' },
						credentials: {
							httpBasicAuth: { id: '1', name: 'My Auth' },
						},
					},
				],
				connections: {},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain('credentials:');
			expect(code).toContain("httpBasicAuth: { id: '1', name: 'My Auth' }");
		});

		it('generates batch() for SplitInBatches pattern with defaults', () => {
			const json: WorkflowJSON = {
				name: 'Test Workflow',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Split In Batches',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [200, 0],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Split In Batches', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain('batch(items, (item) => {');
			expect(code).not.toContain('for (const');
		});

		it('generates batch() with config when non-default batchSize', () => {
			const json: WorkflowJSON = {
				name: 'Batch Config',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Split In Batches',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [200, 0],
						parameters: { batchSize: 10 },
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Split In Batches', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain('batch(items, { params: { batchSize: 10 }');
			expect(code).toContain('(item) => {');
		});

		it('generates batch() with config when custom name', () => {
			const json: WorkflowJSON = {
				name: 'Custom Name',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Process Each',
						type: 'n8n-nodes-base.splitInBatches',
						typeVersion: 3,
						position: [200, 0],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Process Each', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateFromWorkflow(json);

			expect(code).toContain("batch(items, { name: 'Process Each' }");
		});

		describe('IF/Else handling', () => {
			it('generates if/else block with simple equality condition', () => {
				const json: WorkflowJSON = {
					name: 'IF Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'False Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [
								[{ node: 'True Branch', type: 'main', index: 0 }],
								[{ node: 'False Branch', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("if (items[0].json.status === 'active')");
				expect(code).toContain('} else {');
				expect(code).toContain('const true_Branch = executeNode(');
				expect(code).toContain('const false_Branch = executeNode(');
			});

			it('generates if block with true-only branch (no else)', () => {
				const json: WorkflowJSON = {
					name: 'IF True Only',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("if (items[0].json.status === 'active')");
				expect(code).not.toContain('} else {');
				expect(code).toContain('const true_Branch = executeNode(');
			});

			it('generates if block with boolean true condition (truthy check)', () => {
				const json: WorkflowJSON = {
					name: 'IF Boolean True',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'boolean', operation: 'true', singleValue: true },
											leftValue: '={{ $json.is_fragile }}',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'False Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [
								[{ node: 'True Branch', type: 'main', index: 0 }],
								[{ node: 'False Branch', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('if (items[0].json.is_fragile)');
				expect(code).toContain('} else {');
			});

			it('generates if block with notEquals operator', () => {
				const json: WorkflowJSON = {
					name: 'IF NotEquals',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'notEquals' },
											leftValue: '={{ $json.role }}',
											rightValue: 'admin',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("if (items[0].json.role !== 'admin')");
			});

			it('generates if block with contains operator', () => {
				const json: WorkflowJSON = {
					name: 'IF Contains',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'contains' },
											leftValue: '={{ $json.email }}',
											rightValue: '@example.com',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain("if (items[0].json.email.includes('@example.com'))");
			});

			it('generates if block with exists operator', () => {
				const json: WorkflowJSON = {
					name: 'IF Exists',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.phone }}',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('if (items[0].json.phone !== undefined)');
			});

			it('generates comment for complex conditions (multiple conditions)', () => {
				const json: WorkflowJSON = {
					name: 'IF Complex',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'IF',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'or',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
										{
											id: 'cond2',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.role }}',
											rightValue: 'admin',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Branch',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'IF', type: 'main', index: 0 }]],
						},
						IF: {
							main: [[{ node: 'True Branch', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should have a comment indicating complex condition
				expect(code).toContain('// Complex condition');
				expect(code).toContain('if (');
			});
		});

		describe('Filter handling', () => {
			it('generates .filter() with item-level condition for simple equality', () => {
				const json: WorkflowJSON = {
					name: 'Filter Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'Notify',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [400, 0],
							parameters: { url: 'https://example.com/notify' },
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Filter', type: 'main', index: 0 }]],
						},
						Filter: {
							main: [[{ node: 'Notify', type: 'main', index: 0 }], []],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should use .filter() with item-level expression (item.json.x, not items[0].json.x)
				expect(code).toContain(".filter((item) => item.json.status === 'active')");
				// Downstream node should use .map() (not insideBranch)
				expect(code).toContain('.map((item) =>');
				expect(code).toContain("type: 'n8n-nodes-base.httpRequest'");
			});

			it('generates .filter() with kept and discarded branches', () => {
				const json: WorkflowJSON = {
					name: 'Filter Both Branches',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.active }}',
											rightValue: 'yes',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'Kept Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Discarded Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Filter', type: 'main', index: 0 }]],
						},
						Filter: {
							main: [
								[{ node: 'Kept Handler', type: 'main', index: 0 }],
								[{ node: 'Discarded Handler', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain(".filter((item) => item.json.active === 'yes')");
				expect(code).toContain('// discarded items branch');
			});

			it('does not generate if/else for Filter nodes', () => {
				const json: WorkflowJSON = {
					name: 'Filter Not IfElse',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											id: 'cond1',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'active',
										},
									],
								},
							},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Filter', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Filter should NOT produce if/else blocks
				expect(code).not.toContain('if (');
				expect(code).not.toContain('} else {');
				// Should produce .filter()
				expect(code).toContain('.filter(');
			});
		});

		describe('Switch/Case handling', () => {
			it('generates switch/case block with 2 cases and default', () => {
				const json: WorkflowJSON = {
					name: 'Switch Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Switch',
							type: 'n8n-nodes-base.switch',
							typeVersion: 3,
							position: [200, 0],
							parameters: {
								rules: {
									values: [
										{
											outputKey: 'London',
											conditions: {
												options: {
													version: 2,
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: 'r1',
														operator: { type: 'string', operation: 'equals' },
														leftValue: '={{ $json.destination }}',
														rightValue: 'London',
													},
												],
											},
										},
										{
											outputKey: 'New York',
											conditions: {
												options: {
													version: 2,
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: 'r2',
														operator: { type: 'string', operation: 'equals' },
														leftValue: '={{ $json.destination }}',
														rightValue: 'New York',
													},
												],
											},
										},
									],
								},
								options: {},
								fallbackOutput: 'extra',
							},
						},
						{
							id: '3',
							name: 'London Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'New York Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 0],
							parameters: {},
						},
						{
							id: '5',
							name: 'Default Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Switch', type: 'main', index: 0 }]],
						},
						Switch: {
							main: [
								[{ node: 'London Handler', type: 'main', index: 0 }],
								[{ node: 'New York Handler', type: 'main', index: 0 }],
								[{ node: 'Default Handler', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('switch (items[0].json.destination)');
				expect(code).toContain("case 'London':");
				expect(code).toContain("case 'New York':");
				expect(code).toContain('default:');
			});

			it('generates correct node calls inside switch case bodies', () => {
				const json: WorkflowJSON = {
					name: 'Switch Bodies',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Switch',
							type: 'n8n-nodes-base.switch',
							typeVersion: 3,
							position: [200, 0],
							parameters: {
								rules: {
									values: [
										{
											outputKey: 'A',
											conditions: {
												options: {
													version: 2,
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: 'r1',
														operator: { type: 'string', operation: 'equals' },
														leftValue: '={{ $json.category }}',
														rightValue: 'A',
													},
												],
											},
										},
										{
											outputKey: 'B',
											conditions: {
												options: {
													version: 2,
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: 'r2',
														operator: { type: 'string', operation: 'equals' },
														leftValue: '={{ $json.category }}',
														rightValue: 'B',
													},
												],
											},
										},
									],
								},
								options: {},
								fallbackOutput: 'extra',
							},
						},
						{
							id: '3',
							name: 'Handler A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Handler B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 0],
							parameters: {},
						},
						{
							id: '5',
							name: 'Fallback',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Switch', type: 'main', index: 0 }]],
						},
						Switch: {
							main: [
								[{ node: 'Handler A', type: 'main', index: 0 }],
								[{ node: 'Handler B', type: 'main', index: 0 }],
								[{ node: 'Fallback', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				expect(code).toContain('const handler_A = executeNode(');
				expect(code).toContain('const handler_B = executeNode(');
				expect(code).toContain('const fallback = executeNode(');
				expect(code).toContain('break;');
			});
		});

		describe('executeOnce and .map() wrapping', () => {
			it('emits .map() for per-item nodes (no executeOnce)', () => {
				const json: WorkflowJSON = {
					name: 'Per Item',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://example.com' },
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('items.map((item) =>');
				expect(code).not.toMatch(/const hTTP_Request = executeNode\(/);
			});

			it('emits plain executeNode() for execute-once nodes', () => {
				const json: WorkflowJSON = {
					name: 'Execute Once',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://example.com' },
							executeOnce: true,
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('const hTTP_Request = executeNode(');
				expect(code).not.toContain('.map(');
			});

			it('emits plain executeNode() inside if/else branches', () => {
				const json: WorkflowJSON = {
					name: 'Branch Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'If',
							type: 'n8n-nodes-base.if',
							typeVersion: 2,
							position: [200, 0],
							parameters: {
								conditions: {
									options: { version: 2, caseSensitive: true, typeValidation: 'loose' },
									combinator: 'and',
									conditions: [
										{
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'ok',
										},
									],
								},
							},
						},
						{
							id: '3',
							name: 'True Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 0],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'If', type: 'main', index: 0 }]],
						},
						If: {
							main: [[{ node: 'True Handler', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				// Branch body should use plain executeNode(), not .map()
				expect(code).toContain('const true_Handler = executeNode(');
				expect(code).not.toContain('true_Handler = items.map');
			});

			it('uses item as param ref inside .map() for variable references', () => {
				const json: WorkflowJSON = {
					name: 'Param Ref',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Fetch',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://example.com' },
							executeOnce: true,
						},
						{
							id: '3',
							name: 'Send',
							type: 'n8n-nodes-base.emailSend',
							typeVersion: 2,
							position: [400, 0],
							parameters: { toEmail: '={{ $json.email }}' },
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Fetch', type: 'main', index: 0 }]],
						},
						Fetch: {
							main: [[{ node: 'Send', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				// Send is per-item, inside .map() — should use item.json.email
				expect(code).toContain('.map((item) =>');
				expect(code).toContain('item.json.email');
				// Should NOT use fetch.json.email (that's for execute-once context)
				expect(code).not.toContain('fetch.json.email');
			});

			it('chains .map() calls using previous variable as source', () => {
				const json: WorkflowJSON = {
					name: 'Chain Map',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://example.com' },
						},
						{
							id: '3',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 0],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
						'HTTP Request': {
							main: [[{ node: 'Set', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				// First node maps from items
				expect(code).toContain('items.map((item) =>');
				// Second node maps from first node's variable
				expect(code).toContain('hTTP_Request.map((item) =>');
			});
		});

		describe('Error handling (try/catch)', () => {
			it('generates try/catch for nodes with errorHandler', () => {
				const json: WorkflowJSON = {
					name: 'Error Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://api.example.com' },
							onError: 'continueErrorOutput',
						},
						{
							id: '3',
							name: 'Error Handler',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
						'HTTP Request': {
							main: [[], [{ node: 'Error Handler', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('try {');
				expect(code).toContain('} catch');
				// try block node and catch block handler both use plain executeNode()
				expect(code).toContain('const hTTP_Request = executeNode(');
				expect(code).toContain('const error_Handler = executeNode(');
			});

			it('generates normal code for leaf nodes without errorHandler', () => {
				const json: WorkflowJSON = {
					name: 'No Error Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 0],
							parameters: { url: 'https://api.example.com' },
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).not.toContain('try {');
				expect(code).not.toContain('catch');
				// Per-item node (no executeOnce) wraps in .map()
				expect(code).toContain('const hTTP_Request = items.map((item) =>');
			});
		});

		describe('Multi-output nodes (array destructuring)', () => {
			it('generates array destructuring for multi-output nodes', () => {
				const json: WorkflowJSON = {
					name: 'Multi Output Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'Only In A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Only In B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 0],
							parameters: {},
						},
						{
							id: '5',
							name: 'In Both',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Compare Datasets': {
							main: [
								[{ node: 'Only In A', type: 'main', index: 0 }],
								[{ node: 'Only In B', type: 'main', index: 0 }],
								[{ node: 'In Both', type: 'main', index: 0 }],
							],
						},
					},
				};
				const code = generateFromWorkflow(json);
				// Should have array destructuring
				expect(code).toContain('const [');
				expect(code).toContain('] = executeNode(');
			});

			it('uses _ placeholder for unused output indices', () => {
				// Node with outputs at index 0 and 2 (index 1 is unused)
				const json: WorkflowJSON = {
					name: 'Sparse Output Test',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'Only In A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'In Both',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Compare Datasets': {
							main: [
								[{ node: 'Only In A', type: 'main', index: 0 }],
								[],
								[{ node: 'In Both', type: 'main', index: 0 }],
							],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('const [');
				// Should have placeholder for index 1
				expect(code).toMatch(/const \[.+, _, .+\]/);
			});

			it('generates downstream code for each output branch', () => {
				const json: WorkflowJSON = {
					name: 'Multi Output Downstream',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'Handle A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Handle B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Compare Datasets': {
							main: [
								[{ node: 'Handle A', type: 'main', index: 0 }],
								[{ node: 'Handle B', type: 'main', index: 0 }],
							],
						},
					},
				};
				const code = generateFromWorkflow(json);
				// Each output target should be generated using its variable
				expect(code).toContain('const handle_A = compare_Datasets_0.map((item) =>');
				expect(code).toContain('const handle_B = compare_Datasets_1.map((item) =>');
			});
		});

		describe('AI subnodes', () => {
			it('includes subnodes in config for AI nodes', () => {
				const json: WorkflowJSON = {
					name: 'AI Test',
					nodes: [
						{
							id: '1',
							name: 'Chat Trigger',
							type: '@n8n/n8n-nodes-langchain.chatTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1,
							position: [200, 0],
							parameters: { agent: 'conversationalAgent' },
						},
						{
							id: '3',
							name: 'OpenAI Chat Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 200],
							parameters: { model: 'gpt-4' },
						},
					],
					connections: {
						'Chat Trigger': {
							main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
						},
						'OpenAI Chat Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('subnodes:');
				expect(code).toContain('model: languageModel(');
				expect(code).toContain("type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'");
			});

			it('uses array format for ai_tool subnodes', () => {
				const json: WorkflowJSON = {
					name: 'AI Tool Test',
					nodes: [
						{
							id: '1',
							name: 'Chat Trigger',
							type: '@n8n/n8n-nodes-langchain.chatTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'OpenAI Chat Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 200],
							parameters: { model: 'gpt-4' },
						},
						{
							id: '4',
							name: 'Calculator',
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							typeVersion: 1,
							position: [300, 200],
							parameters: {},
						},
					],
					connections: {
						'Chat Trigger': {
							main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
						},
						'OpenAI Chat Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
						Calculator: {
							ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('subnodes:');
				// tools should always be array
				expect(code).toMatch(/tools: \[/);
				// model (single item) should not be array
				expect(code).toMatch(/model: languageModel\(/);
			});

			it('includes subnode params, version, and credentials', () => {
				const json: WorkflowJSON = {
					name: 'AI Params Test',
					nodes: [
						{
							id: '1',
							name: 'Chat Trigger',
							type: '@n8n/n8n-nodes-langchain.chatTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'AI Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'OpenAI Chat Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							typeVersion: 1,
							position: [200, 200],
							parameters: { model: 'gpt-4', temperature: 0.7 },
							credentials: {
								openAiApi: { id: '1', name: 'OpenAI' },
							},
						},
					],
					connections: {
						'Chat Trigger': {
							main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
						},
						'OpenAI Chat Model': {
							ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
						},
					},
				};
				const code = generateFromWorkflow(json);
				expect(code).toContain('subnodes:');
				expect(code).toContain("model: 'gpt-4'");
				expect(code).toContain('temperature: 0.7');
				expect(code).toContain('version: 1');
				expect(code).toContain("openAiApi: { id: '1', name: 'OpenAI' }");
			});
		});

		describe('multi-input nodes (array input syntax)', () => {
			it('generates array input syntax for merge node with 2 inputs', () => {
				const json: WorkflowJSON = {
					name: 'Merge Workflow',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, -100],
							parameters: { url: 'https://api.example.com/users' },
						},
						{
							id: '3',
							name: 'Fetch Orders',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 100],
							parameters: { url: 'https://api.example.com/orders' },
						},
						{
							id: '4',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [400, 0],
							parameters: {
								mode: 'combine',
								combineBy: 'combineByPosition',
							},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [
								[
									{ node: 'Fetch Users', type: 'main', index: 0 },
									{ node: 'Fetch Orders', type: 'main', index: 0 },
								],
							],
						},
						'Fetch Users': {
							main: [[{ node: 'Merge', type: 'main', index: 0 }]],
						},
						'Fetch Orders': {
							main: [[{ node: 'Merge', type: 'main', index: 1 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should contain array input syntax: executeNode({...}, [var0, var1])
				expect(code).toContain('[fetch_Users, fetch_Orders]');
				expect(code).toContain("type: 'n8n-nodes-base.merge'");
				// Should NOT contain the unsupported pattern comment
				expect(code).not.toContain('// TODO: unsupported pattern');
			});

			it('generates array input syntax for Compare Datasets with multi-output', () => {
				const json: WorkflowJSON = {
					name: 'Compare Workflow',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Data A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [200, -100],
							parameters: {},
						},
						{
							id: '3',
							name: 'Data B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [200, 100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [400, 0],
							parameters: {
								mergeByFields: {
									values: [{ field1: 'id', field2: 'id' }],
								},
							},
						},
						{
							id: '5',
							name: 'Only In A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [600, -100],
							parameters: {},
						},
						{
							id: '6',
							name: 'Only In B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [600, 0],
							parameters: {},
						},
						{
							id: '7',
							name: 'In Both',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [600, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [
								[
									{ node: 'Data A', type: 'main', index: 0 },
									{ node: 'Data B', type: 'main', index: 0 },
								],
							],
						},
						'Data A': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Data B': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 1 }]],
						},
						'Compare Datasets': {
							main: [
								[{ node: 'Only In A', type: 'main', index: 0 }],
								[{ node: 'Only In B', type: 'main', index: 0 }],
								[{ node: 'In Both', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should have array input syntax with destructuring
				expect(code).toContain('[data_A, data_B]');
				expect(code).toContain('compare_Datasets_0');
				expect(code).toContain('compare_Datasets_1');
				expect(code).toContain('compare_Datasets_2');
			});

			it('does not emit array input for single-input multi-output nodes', () => {
				// Compare Datasets with only 1 input — should NOT emit array syntax
				const json: WorkflowJSON = {
					name: 'Single Input Multi Output',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
						{
							id: '3',
							name: 'Only In A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, -100],
							parameters: {},
						},
						{
							id: '4',
							name: 'In Both',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [400, 100],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Compare Datasets': {
							main: [
								[{ node: 'Only In A', type: 'main', index: 0 }],
								[],
								[{ node: 'In Both', type: 'main', index: 0 }],
							],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should NOT contain array input syntax — only single input
				expect(code).not.toMatch(/executeNode\([^)]+,\s*\[/);
				// Should still have multi-output destructuring
				expect(code).toContain('compare_Datasets_0');
				expect(code).toContain('compare_Datasets_2');
			});

			it('generates merge with downstream chain after merge', () => {
				const json: WorkflowJSON = {
					name: 'Merge With Downstream',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, -100],
							parameters: { url: 'https://api.example.com/users' },
						},
						{
							id: '3',
							name: 'Fetch Orders',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							position: [200, 100],
							parameters: { url: 'https://api.example.com/orders' },
						},
						{
							id: '4',
							name: 'Merge',
							type: 'n8n-nodes-base.merge',
							typeVersion: 3,
							position: [400, 0],
							parameters: { mode: 'combine', combineBy: 'combineByPosition' },
						},
						{
							id: '5',
							name: 'Process Result',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [600, 0],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [
								[
									{ node: 'Fetch Users', type: 'main', index: 0 },
									{ node: 'Fetch Orders', type: 'main', index: 0 },
								],
							],
						},
						'Fetch Users': {
							main: [[{ node: 'Merge', type: 'main', index: 0 }]],
						},
						'Fetch Orders': {
							main: [[{ node: 'Merge', type: 'main', index: 1 }]],
						},
						Merge: {
							main: [[{ node: 'Process Result', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Should emit merge with array inputs
				expect(code).toContain('[fetch_Users, fetch_Orders]');
				// Should emit downstream node chained from merge
				expect(code).toContain('process_Result');
				expect(code).toContain('merge_node.map');
			});

			it('orders fan-out leaf targets before chain targets', () => {
				// Verifies that simple leaves (Data B) come before chains (Data A → Compare)
				// so array input references are resolvable
				const json: WorkflowJSON = {
					name: 'Fan-Out Order',
					nodes: [
						{
							id: '1',
							name: 'Manual Trigger',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: '2',
							name: 'Data A',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [200, -100],
							parameters: {},
						},
						{
							id: '3',
							name: 'Data B',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [200, 100],
							parameters: {},
						},
						{
							id: '4',
							name: 'Compare Datasets',
							type: 'n8n-nodes-base.compareDatasets',
							typeVersion: 1,
							position: [400, 0],
							parameters: {},
						},
						{
							id: '5',
							name: 'Result',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [600, 0],
							parameters: {},
						},
					],
					connections: {
						'Manual Trigger': {
							main: [
								[
									{ node: 'Data A', type: 'main', index: 0 },
									{ node: 'Data B', type: 'main', index: 0 },
								],
							],
						},
						'Data A': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 0 }]],
						},
						'Data B': {
							main: [[{ node: 'Compare Datasets', type: 'main', index: 1 }]],
						},
						'Compare Datasets': {
							main: [[{ node: 'Result', type: 'main', index: 0 }]],
						},
					},
				};

				const code = generateFromWorkflow(json);

				// Data B (leaf target) should appear before Data A → Compare chain
				const dataBIndex = code.indexOf('data_B');
				const dataAIndex = code.indexOf('data_A');
				expect(dataBIndex).toBeLessThan(dataAIndex);
			});
		});
	});
});
