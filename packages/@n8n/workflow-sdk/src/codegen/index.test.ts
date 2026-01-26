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
			expect(code).toContain('return wf');
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

			expect(code).toContain('ifElse(iF, { true:');
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

			expect(code).toContain('merge(');
			expect(code).toContain('{ input0:');
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
			expect(code).toContain('return wf');
			expect(code).not.toContain('.toJSON();');
		});
	});
});
