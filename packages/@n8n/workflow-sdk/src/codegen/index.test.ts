import { describe, it, expect } from '@jest/globals';

import { generateWorkflowCode } from './index';
import type { WorkflowJSON } from '../types/base';

describe('codegen index', () => {
	describe('generateWorkflowCode', () => {
		it('generates complete workflow code', () => {
			const json: WorkflowJSON = {
				id: 'test-workflow-id',
				name: 'Test Workflow',
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
					Trigger: { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
				},
			};

			const code = generateWorkflowCode(json);

			expect(code).toContain("const wf = workflow('test-workflow-id', 'Test Workflow')");
			expect(code).toContain('.add(');
			expect(code).toContain('export default wf');
			expect(code).not.toContain('.toJSON();');
		});

		it('generates code with IF branch', () => {
			const json: WorkflowJSON = {
				name: 'IF Test',
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
						name: 'True',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: '4',
						name: 'False',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, 50],
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
					IF: {
						main: [
							[{ node: 'True', type: 'main', index: 0 }],
							[{ node: 'False', type: 'main', index: 0 }],
						],
					},
				},
			};

			const code = generateWorkflowCode(json);

			expect(code).toContain('iF.onTrue(true_node).onFalse(false_node)');
		});

		it('generates code with merge', () => {
			const json: WorkflowJSON = {
				name: 'Merge Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{ id: '2', name: 'A', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [100, -50] },
					{ id: '3', name: 'B', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [100, 50] },
					{
						id: '4',
						name: 'Merge',
						type: 'n8n-nodes-base.merge',
						typeVersion: 3,
						position: [200, 0],
						parameters: { numberInputs: 2 },
					},
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
					A: { main: [[{ node: 'Merge', type: 'main', index: 0 }]] },
					B: { main: [[{ node: 'Merge', type: 'main', index: 1 }]] },
				},
			};

			const code = generateWorkflowCode(json);

			// Should use .input(n) syntax for connecting branches to merge
			expect(code).toContain('.input(0)');
			expect(code).toContain('.input(1)');
			expect(code).toContain('merge_node'); // The merge node variable
		});

		it('handles empty workflow', () => {
			const json: WorkflowJSON = {
				name: 'Empty',
				nodes: [],
				connections: {},
			};

			const code = generateWorkflowCode(json);

			// Empty string for undefined ID (preserves original for roundtrip)
			expect(code).toContain("const wf = workflow('', 'Empty')");
			expect(code).toContain('export default wf');
			expect(code).not.toContain('.toJSON();');
		});

		describe('execution context options', () => {
			it('accepts options object with execution schema', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [
								{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' },
								{ type: 'string' as const, key: 'name', value: 'John', path: 'name' },
							],
						},
					},
				];

				const code = generateWorkflowCode({ workflow: json, executionSchema });

				// Should have output property with redacted values (strings→'', numbers→0, booleans→false)
				expect(code).not.toContain('@output');
				expect(code).toContain("output: [{ id: '', name: '' }]");
			});

			it('accepts options object with expression values', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [0, 0],
							parameters: {
								fields: { values: [{ name: 'greeting', stringValue: '={{ $json.name }}' }] },
							},
						},
					],
					connections: {},
				};

				const expressionValues = {
					Set: [{ expression: '={{ $json.name }}', resolvedValue: 'John Doe' }],
				};

				const code = generateWorkflowCode({ workflow: json, expressionValues });

				expect(code).toContain('/** @example "John Doe" */');
			});

			it('accepts options object with execution data for status', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Success Node',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
						},
					],
					connections: {},
				};

				const executionData = {
					lastNodeExecuted: 'Success Node',
					runData: {
						'Success Node': [{ startTime: 0, executionTime: 100, executionIndex: 0, source: [] }],
					},
				};

				const code = generateWorkflowCode({ workflow: json, executionData });

				expect(code).toContain('@workflowExecutionStatus success');
				expect(code).toContain('@lastExecuted "Success Node"');
			});

			it('maintains backward compatibility with plain WorkflowJSON', () => {
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
					],
					connections: {},
				};

				// Old API - just pass WorkflowJSON directly
				const code = generateWorkflowCode(json);

				expect(code).toContain("workflow('', 'Test')");
				expect(code).toContain('trigger(');
			});

			it('adds redaction comment when valuesExcluded is true', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [
								{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' },
								{ type: 'string' as const, key: 'name', value: 'John', path: 'name' },
							],
						},
					},
				];

				const code = generateWorkflowCode({
					workflow: json,
					executionSchema,
					valuesExcluded: true,
				});

				expect(code).toContain('// Output values redacted');
				expect(code).toContain("output: [{ id: '', name: '' }]");
			});

			it('does not add redaction comment when valuesExcluded is false', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' }],
						},
					},
				];

				const code = generateWorkflowCode({
					workflow: json,
					executionSchema,
					valuesExcluded: false,
				});

				expect(code).not.toContain('// Output values redacted');
				expect(code).toContain("output: [{ id: 'usr_123' }]");
			});

			it('adds pinned data comment when node is in pinnedNodes', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [
								{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' },
								{ type: 'string' as const, key: 'name', value: 'John', path: 'name' },
							],
						},
					},
				];

				const code = generateWorkflowCode({
					workflow: json,
					executionSchema,
					pinnedNodes: ['Fetch Users'],
				});

				expect(code).toContain('// Data is pinned. User must unpin node for real data');
			});

			it('does not add pinned data comment when node is not in pinnedNodes', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' }],
						},
					},
				];

				const code = generateWorkflowCode({
					workflow: json,
					executionSchema,
					pinnedNodes: ['Some Other Node'],
				});

				expect(code).not.toContain('// Data is pinned. User must unpin node for real data');
			});

			it('does not add pinned data comment when pinnedNodes is undefined', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' }],
						},
					},
				];

				const code = generateWorkflowCode({ workflow: json, executionSchema });

				expect(code).not.toContain('// Data is pinned. User must unpin node for real data');
			});

			it('does not add redaction comment when valuesExcluded is undefined', () => {
				const json: WorkflowJSON = {
					name: 'Test',
					nodes: [
						{
							id: '1',
							name: 'Fetch Users',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [0, 0],
							parameters: { url: 'https://api.example.com/users' },
						},
					],
					connections: {},
				};

				const executionSchema = [
					{
						nodeName: 'Fetch Users',
						schema: {
							type: 'object' as const,
							path: '',
							value: [{ type: 'string' as const, key: 'id', value: 'usr_123', path: 'id' }],
						},
					},
				];

				// Without valuesExcluded, should not add comment
				const code = generateWorkflowCode({ workflow: json, executionSchema });

				expect(code).not.toContain('// Output values redacted');
			});
		});
	});
});
