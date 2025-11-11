import { mock } from 'jest-mock-extended';
import type { INode, IRunExecutionData, Workflow } from 'n8n-workflow';

import { establishExecutionContext } from '../execution-context';

describe('establishExecutionContext', () => {
	const mockWorkflow = mock<Workflow>();

	describe('successful context establishment', () => {
		it('should establish context with version 1 and timestamp', async () => {
			const startNode = mock<INode>({ name: 'Start', type: 'n8n-nodes-base.start' });
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: {
								main: [[{ json: {} }]],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const beforeTimestamp = Date.now();
			await establishExecutionContext(mockWorkflow, runExecutionData);
			const afterTimestamp = Date.now();

			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
			expect(runExecutionData.executionData!.runtimeData).toHaveProperty('version', 1);
			expect(runExecutionData.executionData!.runtimeData).toHaveProperty('establishedAt');

			const establishedAt = runExecutionData.executionData!.runtimeData!.establishedAt;
			expect(establishedAt).toBeGreaterThanOrEqual(beforeTimestamp);
			expect(establishedAt).toBeLessThanOrEqual(afterTimestamp);
		});

		it('should mutate the provided runExecutionData object', async () => {
			const startNode = mock<INode>({ name: 'Start', type: 'n8n-nodes-base.start' });
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: {
								main: [[{ json: {} }]],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const referenceBefore = runExecutionData.executionData;
			await establishExecutionContext(mockWorkflow, runExecutionData);
			const referenceAfter = runExecutionData.executionData;

			// Verify the same object reference is used (mutation, not replacement)
			expect(referenceBefore).toBe(referenceAfter);
			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
		});

		it('should establish context when execution stack has multiple nodes', async () => {
			const startNode = mock<INode>({ name: 'Start', type: 'n8n-nodes-base.start' });
			const secondNode = mock<INode>({ name: 'Second', type: 'n8n-nodes-base.set' });
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: {
								main: [[{ json: {} }]],
							},
							source: null,
						},
						{
							node: secondNode,
							data: {
								main: [[{ json: {} }]],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData);

			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
			expect(runExecutionData.executionData!.runtimeData!.version).toBe(1);
		});
	});

	describe('error handling', () => {
		it('should throw error when executionData is missing', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				// executionData is missing
			};

			await expect(establishExecutionContext(mockWorkflow, runExecutionData)).rejects.toThrow(
				'Execution data is missing, this state is not expected, when the workflow is executed the execution data should be initialized.',
			);
		});

		it('should throw error when executionData is undefined', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: undefined,
			};

			await expect(establishExecutionContext(mockWorkflow, runExecutionData)).rejects.toThrow(
				'Execution data is missing, this state is not expected, when the workflow is executed the execution data should be initialized.',
			);
		});

		it('should throw error when nodeExecutionStack is empty', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [], // Empty stack
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await expect(establishExecutionContext(mockWorkflow, runExecutionData)).rejects.toThrow(
				'Empty execution stack on workflow execution, failed to establish execution context',
			);
		});

		it('should throw error when nodeExecutionStack is undefined', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: undefined as any, // Simulating undefined
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await expect(establishExecutionContext(mockWorkflow, runExecutionData)).rejects.toThrow();
		});
	});

	describe('context structure validation', () => {
		it('should create context with correct structure', async () => {
			const startNode = mock<INode>({ name: 'Webhook', type: 'n8n-nodes-base.webhook' });
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: {
								main: [[{ json: { test: 'data' } }]],
							},
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData);

			const context = runExecutionData.executionData!.runtimeData;

			// Verify context has only expected properties
			expect(Object.keys(context!)).toEqual(['version', 'establishedAt']);
			expect(typeof context!.version).toBe('number');
			expect(typeof context!.establishedAt).toBe('number');
		});

		it('should create unique timestamps for different executions', async () => {
			const startNode = mock<INode>({ name: 'Start', type: 'n8n-nodes-base.start' });

			const runExecutionData1: IRunExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: { main: [[{ json: {} }]] },
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const runExecutionData2: IRunExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: startNode,
							data: { main: [[{ json: {} }]] },
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData1);
			// Small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 5));
			await establishExecutionContext(mockWorkflow, runExecutionData2);

			const timestamp1 = runExecutionData1.executionData!.runtimeData!.establishedAt;
			const timestamp2 = runExecutionData2.executionData!.runtimeData!.establishedAt;

			expect(timestamp1).toBeLessThan(timestamp2);
		});
	});
});
