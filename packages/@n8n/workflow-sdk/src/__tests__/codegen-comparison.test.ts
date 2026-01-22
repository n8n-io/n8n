/**
 * Comparison tests between old and new codegen implementations.
 * This file helps identify differences during migration.
 */
import { describe, it, expect } from '@jest/globals';
import { generateWorkflowCode as generateOld } from '../codegen';
import { generateWorkflowCode as generateNew } from '../codegen/index';
import { parseWorkflowCode } from '../parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

describe('codegen comparison', () => {
	describe('simple workflows', () => {
		it('generates code for single trigger - compare old vs new', () => {
			const json: WorkflowJSON = {
				id: 'test-123',
				name: 'Single Trigger',
				nodes: [
					{
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			};

			const oldCode = generateOld(json);
			const newCode = generateNew(json);

			console.log('=== OLD CODE ===');
			console.log(oldCode);
			console.log('\n=== NEW CODE ===');
			console.log(newCode);

			// Both should generate valid code
			expect(oldCode).toContain("workflow('test-123'");
			expect(newCode).toContain("workflow('test-123'");
		});

		it('generates code for linear chain - compare old vs new', () => {
			const json: WorkflowJSON = {
				id: 'test-456',
				name: 'Linear Chain',
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'node-2',
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

			const oldCode = generateOld(json);
			const newCode = generateNew(json);

			console.log('=== OLD CODE (Linear) ===');
			console.log(oldCode);
			console.log('\n=== NEW CODE (Linear) ===');
			console.log(newCode);

			// Both should have chaining
			expect(oldCode).toContain('.then(');
			expect(newCode).toContain('.then(');
		});

		it('generates code for IF branch - compare old vs new', () => {
			const json: WorkflowJSON = {
				id: 'test-if',
				name: 'IF Test',
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'node-2',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 2,
						position: [100, 0],
					},
					{
						id: 'node-3',
						name: 'True Branch',
						type: 'n8n-nodes-base.noOp',
						typeVersion: 1,
						position: [200, -50],
					},
					{
						id: 'node-4',
						name: 'False Branch',
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
							[{ node: 'True Branch', type: 'main', index: 0 }],
							[{ node: 'False Branch', type: 'main', index: 0 }],
						],
					},
				},
			};

			const oldCode = generateOld(json);
			const newCode = generateNew(json);

			console.log('=== OLD CODE (IF) ===');
			console.log(oldCode);
			console.log('\n=== NEW CODE (IF) ===');
			console.log(newCode);

			// Both should have ifBranch
			expect(oldCode).toContain('ifBranch');
			expect(newCode).toContain('ifBranch');
		});
	});

	describe('roundtrip parsing', () => {
		it('new codegen output can be parsed back to JSON', () => {
			const json: WorkflowJSON = {
				id: 'roundtrip-test',
				name: 'Roundtrip Test',
				nodes: [
					{
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
			};

			const code = generateNew(json);
			console.log('=== NEW CODE FOR PARSING ===');
			console.log(code);

			// Try to parse the new code
			const parsed = parseWorkflowCode(code);

			console.log('=== PARSED JSON ===');
			console.log(JSON.stringify(parsed, null, 2));

			// Verify basic structure
			expect(parsed.name).toBe('Roundtrip Test');
			expect(parsed.nodes).toHaveLength(1);
			expect(parsed.nodes[0].type).toBe('n8n-nodes-base.manualTrigger');
		});

		it('new codegen output preserves connections in parsing', () => {
			const json: WorkflowJSON = {
				id: 'roundtrip-chain',
				name: 'Roundtrip Chain',
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
					},
					{
						id: 'node-2',
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

			const code = generateNew(json);
			console.log('=== NEW CODE WITH CHAIN ===');
			console.log(code);

			const parsed = parseWorkflowCode(code);

			console.log('=== PARSED CHAIN JSON ===');
			console.log(JSON.stringify(parsed, null, 2));

			// Verify connections
			expect(parsed.nodes).toHaveLength(2);
			expect(parsed.connections).toBeDefined();
			expect(parsed.connections.Trigger).toBeDefined();
		});
	});
});
