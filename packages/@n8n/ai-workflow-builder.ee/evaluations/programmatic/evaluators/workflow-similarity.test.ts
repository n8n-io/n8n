import { mock } from 'jest-mock-extended';
import * as childProcess from 'node:child_process';

import type { SimpleWorkflow } from '@/types';

import {
	evaluateWorkflowSimilarity,
	evaluateWorkflowSimilarityMultiple,
} from './workflow-similarity';

// Mock child_process
jest.mock('node:child_process');
jest.mock('node:fs/promises');

const mockExecFile = childProcess.execFile as jest.MockedFunction<typeof childProcess.execFile>;

describe('evaluateWorkflowSimilarity', () => {
	const generatedWorkflow = mock<SimpleWorkflow>({
		name: 'Generated',
		nodes: [
			{
				id: '1',
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
	});

	const groundTruthWorkflow = mock<SimpleWorkflow>({
		name: 'Ground Truth',
		nodes: [
			{
				id: '1',
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			},
		],
		connections: {},
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('successful evaluation', () => {
		it('should parse Python output and map violations correctly', async () => {
			const mockPythonOutput = JSON.stringify({
				similarity_score: 0.75,
				edit_cost: 25,
				max_possible_cost: 100,
				top_edits: [
					{
						type: 'node_insert',
						description: 'Missing node: Code',
						cost: 15,
						priority: 'major',
						node_name: 'Code',
					},
					{
						type: 'edge_delete',
						description: 'Extra connection from Trigger to Code',
						cost: 10,
						priority: 'minor',
					},
				],
				metadata: {
					generated_nodes: 1,
					ground_truth_nodes: 2,
					config_name: 'standard',
				},
			});

			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: null, result: { stdout: string; stderr: string }) => void;
				cb(null, { stdout: mockPythonOutput, stderr: '' });
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			const result = await evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow);

			expect(result.score).toBe(0.75);
			expect(result.violations).toHaveLength(2);
			expect(result.violations[0]).toEqual({
				name: 'workflow-similarity-node-insert',
				type: 'major',
				description: 'Missing node: Code',
				pointsDeducted: 15,
			});
			expect(result.violations[1]).toEqual({
				name: 'workflow-similarity-edge-delete',
				type: 'minor',
				description: 'Extra connection from Trigger to Code',
				pointsDeducted: 10,
			});
		});

		it('should handle all edit types correctly', async () => {
			const mockPythonOutput = JSON.stringify({
				similarity_score: 0.5,
				edit_cost: 50,
				max_possible_cost: 100,
				top_edits: [
					{ type: 'node_insert', description: 'Insert', cost: 10, priority: 'major' },
					{ type: 'node_delete', description: 'Delete', cost: 10, priority: 'major' },
					{ type: 'node_substitute', description: 'Substitute', cost: 10, priority: 'major' },
					{ type: 'edge_insert', description: 'Edge insert', cost: 5, priority: 'minor' },
					{ type: 'edge_delete', description: 'Edge delete', cost: 5, priority: 'minor' },
					{ type: 'edge_substitute', description: 'Edge substitute', cost: 10, priority: 'major' },
				],
				metadata: {
					generated_nodes: 2,
					ground_truth_nodes: 2,
					config_name: 'standard',
				},
			});

			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: null, result: { stdout: string; stderr: string }) => void;
				cb(null, { stdout: mockPythonOutput, stderr: '' });
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			const result = await evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow);

			expect(result.violations).toHaveLength(6);
			expect(result.violations[0].name).toBe('workflow-similarity-node-insert');
			expect(result.violations[1].name).toBe('workflow-similarity-node-delete');
			expect(result.violations[2].name).toBe('workflow-similarity-node-substitute');
			expect(result.violations[3].name).toBe('workflow-similarity-edge-insert');
			expect(result.violations[4].name).toBe('workflow-similarity-edge-delete');
			expect(result.violations[5].name).toBe('workflow-similarity-edge-substitute');
		});

		it('should round cost values to integers', async () => {
			const mockPythonOutput = JSON.stringify({
				similarity_score: 0.85,
				edit_cost: 15.7,
				max_possible_cost: 100,
				top_edits: [
					{
						type: 'node_insert',
						description: 'Missing node',
						cost: 15.7,
						priority: 'major',
					},
				],
				metadata: {
					generated_nodes: 1,
					ground_truth_nodes: 2,
					config_name: 'standard',
				},
			});

			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: null, result: { stdout: string; stderr: string }) => void;
				cb(null, { stdout: mockPythonOutput, stderr: '' });
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			const result = await evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow);

			expect(result.violations[0].pointsDeducted).toBe(16);
		});
	});

	describe('error handling', () => {
		it('should handle uvx command not found error', async () => {
			const error = Object.assign(new Error('Command not found'), { code: 'ENOENT' });
			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: Error) => void;
				cb(error);
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			await expect(
				evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow),
			).rejects.toThrow('uvx command not found');
		});

		it('should handle timeout error', async () => {
			const error = Object.assign(new Error('Timeout'), { killed: true });
			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: Error) => void;
				cb(error);
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			await expect(
				evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow),
			).rejects.toThrow('Workflow comparison timed out');
		});

		it('should handle Python script errors with empty output', async () => {
			const error = Object.assign(new Error('Python error'), {
				stdout: '',
				stderr: 'Something went wrong',
				code: 1,
			});
			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: Error) => void;
				cb(error);
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			await expect(
				evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow),
			).rejects.toThrow('Workflow similarity evaluation failed');
		});

		it('should accept non-zero exit code if Python outputs valid JSON', async () => {
			const mockPythonOutput = JSON.stringify({
				similarity_score: 0.3,
				edit_cost: 70,
				max_possible_cost: 100,
				top_edits: [
					{
						type: 'node_delete',
						description: 'Major difference',
						cost: 70,
						priority: 'critical',
					},
				],
				metadata: {
					generated_nodes: 1,
					ground_truth_nodes: 2,
					config_name: 'standard',
				},
			});

			const error = Object.assign(new Error('Non-zero exit'), {
				stdout: mockPythonOutput,
				stderr: 'Warning: similarity below threshold',
				code: 1,
			});
			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				const cb = callback as (error: Error) => void;
				cb(error);
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			const result = await evaluateWorkflowSimilarity(generatedWorkflow, groundTruthWorkflow);

			expect(result.score).toBe(0.3);
			expect(result.violations).toHaveLength(1);
			expect(result.violations[0].name).toBe('workflow-similarity-node-delete');
		});
	});

	describe('evaluateWorkflowSimilarityMultiple', () => {
		it('should return result with highest similarity score', async () => {
			const referenceWorkflows = [
				mock<SimpleWorkflow>({ name: 'Ref1', nodes: [], connections: {} }),
				mock<SimpleWorkflow>({ name: 'Ref2', nodes: [], connections: {} }),
				mock<SimpleWorkflow>({ name: 'Ref3', nodes: [], connections: {} }),
			];

			let callCount = 0;
			mockExecFile.mockImplementation((cmd, args, opts, callback) => {
				callCount++;
				const score = callCount === 2 ? 0.9 : 0.5; // Second call has highest score
				const mockOutput = JSON.stringify({
					similarity_score: score,
					edit_cost: 10,
					max_possible_cost: 100,
					top_edits: [],
					metadata: { generated_nodes: 1, ground_truth_nodes: 1, config_name: 'standard' },
				});
				const cb = callback as (error: null, result: { stdout: string; stderr: string }) => void;
				cb(null, { stdout: mockOutput, stderr: '' });
				return {} as ReturnType<typeof childProcess.execFile>;
			});

			const result = await evaluateWorkflowSimilarityMultiple(
				generatedWorkflow,
				referenceWorkflows,
			);

			expect(result.score).toBe(0.9);
			expect(mockExecFile).toHaveBeenCalledTimes(3);
		});

		it('should throw error when no reference workflows provided', async () => {
			await expect(evaluateWorkflowSimilarityMultiple(generatedWorkflow, [])).rejects.toThrow(
				'At least one reference workflow is required',
			);
		});
	});
});
