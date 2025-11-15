import { mock } from 'jest-mock-extended';
import {
	UnexpectedError,
	type INode,
	type IRunExecutionData,
	type IWorkflowExecuteAdditionalData,
	type Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { establishExecutionContext } from '../execution-context';

describe('establishExecutionContext', () => {
	const mockWorkflow = mock<Workflow>({ id: 'test-workflow-id' });
	const mockAdditionalData = mock<IWorkflowExecuteAdditionalData>();
	const mockMode: WorkflowExecuteMode = 'manual';

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
			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);
			const afterTimestamp = Date.now();

			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
			expect(runExecutionData.executionData!.runtimeData).toHaveProperty('version', 1);
			expect(runExecutionData.executionData!.runtimeData).toHaveProperty('establishedAt');
			expect(runExecutionData.executionData!.runtimeData).toHaveProperty('source', 'manual');

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
			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);
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

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);

			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
			expect(runExecutionData.executionData!.runtimeData!.version).toBe(1);
		});
	});

	describe('Chat Trigger workflow support', () => {
		it('should establish basic context for empty execution stack (Chat Trigger)', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [], // Empty stack - Chat Trigger workflow
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const beforeTimestamp = Date.now();
			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);
			const afterTimestamp = Date.now();

			// Should establish basic context even with empty stack
			expect(runExecutionData.executionData!.runtimeData).toBeDefined();
			expect(runExecutionData.executionData!.runtimeData!.version).toBe(1);
			expect(runExecutionData.executionData!.runtimeData!.source).toBe('manual');
			expect(runExecutionData.executionData!.runtimeData!.establishedAt).toBeGreaterThanOrEqual(
				beforeTimestamp,
			);
			expect(runExecutionData.executionData!.runtimeData!.establishedAt).toBeLessThanOrEqual(
				afterTimestamp,
			);
		});

		it('should establish basic context without start node extraction for Chat Trigger', async () => {
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

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);

			const context = runExecutionData.executionData!.runtimeData;

			// Verify context has only basic properties (no start-node-specific extraction)
			expect(Object.keys(context!)).toEqual(['version', 'establishedAt', 'source']);
			expect(typeof context!.version).toBe('number');
			expect(typeof context!.establishedAt).toBe('number');
			expect(context!.source).toBe('manual');
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

			await expect(
				establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode),
			).rejects.toThrow(UnexpectedError);
		});

		it('should throw error when executionData is undefined', async () => {
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: undefined,
			};

			await expect(
				establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode),
			).rejects.toThrow(UnexpectedError);
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

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mockMode);

			const context = runExecutionData.executionData!.runtimeData;

			// Verify context has only expected properties
			expect(Object.keys(context!)).toEqual(['version', 'establishedAt', 'source']);
			expect(typeof context!.version).toBe('number');
			expect(typeof context!.establishedAt).toBe('number');
			expect(context!.source).toBe('manual');
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

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData1,
				mockAdditionalData,
				mockMode,
			);
			// Small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 5));
			await establishExecutionContext(
				mockWorkflow,
				runExecutionData2,
				mockAdditionalData,
				mockMode,
			);

			const timestamp1 = runExecutionData1.executionData!.runtimeData!.establishedAt;
			const timestamp2 = runExecutionData2.executionData!.runtimeData!.establishedAt;

			expect(timestamp1).toBeLessThan(timestamp2);
		});

		it('should work with different execution modes', async () => {
			const startNode = mock<INode>({ name: 'Trigger', type: 'n8n-nodes-base.cron' });
			const modes: WorkflowExecuteMode[] = ['manual', 'trigger', 'webhook'];

			for (const mode of modes) {
				const runExecutionData: IRunExecutionData = {
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

				await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, mode);

				expect(runExecutionData.executionData!.runtimeData).toBeDefined();
				expect(runExecutionData.executionData!.runtimeData!.version).toBe(1);
				expect(runExecutionData.executionData!.runtimeData!.source).toBe(mode);
			}
		});
	});
});
