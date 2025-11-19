import { mock } from 'jest-mock-extended';
import {
	UnexpectedError,
	type IExecutionContext,
	type INode,
	type IRunExecutionData,
	type IWorkflowExecuteAdditionalData,
	type RelatedExecution,
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

	describe('webhook resume context preservation', () => {
		it('should preserve existing context when runtimeData already exists', async () => {
			const existingContext: IExecutionContext = {
				version: 1,
				establishedAt: 1234567890,
				source: 'webhook',
				credentials: 'encrypted-credentials-data',
			};

			const startNode = mock<INode>({ name: 'Wait', type: 'n8n-nodes-base.wait' });
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
					runtimeData: existingContext, // Already has context from database
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'manual');

			// Context should remain unchanged
			expect(runExecutionData.executionData!.runtimeData).toEqual(existingContext);
			expect(runExecutionData.executionData!.runtimeData!.establishedAt).toBe(1234567890);
			expect(runExecutionData.executionData!.runtimeData!.source).toBe('webhook');
			expect(runExecutionData.executionData!.runtimeData!.credentials).toBe(
				'encrypted-credentials-data',
			);
		});

		it('should not modify existing context even when mode differs', async () => {
			const existingContext: IExecutionContext = {
				version: 1,
				establishedAt: 9876543210,
				source: 'trigger',
				credentials: 'original-credentials',
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					runtimeData: existingContext,
				},
			};

			// Try to establish with different mode
			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'manual');

			// Original context should be completely preserved
			expect(runExecutionData.executionData!.runtimeData).toEqual(existingContext);
			expect(runExecutionData.executionData!.runtimeData!.source).toBe('trigger'); // NOT 'manual'
		});

		it('should preserve context with parentExecutionId field', async () => {
			const existingContext: IExecutionContext = {
				version: 1,
				establishedAt: 1111111111,
				source: 'webhook',
				parentExecutionId: 'parent-exec-123',
				credentials: 'webhook-credentials',
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					runtimeData: existingContext,
				},
			};

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'webhook',
			);

			expect(runExecutionData.executionData!.runtimeData).toEqual(existingContext);
			expect(runExecutionData.executionData!.runtimeData!.parentExecutionId).toBe(
				'parent-exec-123',
			);
		});
	});

	describe('sub-workflow context inheritance', () => {
		it('should inherit parent context with fresh establishedAt and source', async () => {
			const parentContext: IExecutionContext = {
				version: 1,
				establishedAt: 1000000000,
				source: 'manual',
				credentials: 'parent-credentials',
			};

			const parentExecution: RelatedExecution = {
				executionId: 'parent-execution-id',
				workflowId: 'parent-workflow-id',
				executionContext: parentContext,
			};

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
				parentExecution,
			};

			const beforeTimestamp = Date.now();
			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'trigger',
			);
			const afterTimestamp = Date.now();

			const childContext = runExecutionData.executionData!.runtimeData!;

			// Should inherit credentials from parent
			expect(childContext.credentials).toBe('parent-credentials');
			expect(childContext.version).toBe(1);

			// Should have fresh establishedAt
			expect(childContext.establishedAt).toBeGreaterThanOrEqual(beforeTimestamp);
			expect(childContext.establishedAt).toBeLessThanOrEqual(afterTimestamp);
			expect(childContext.establishedAt).not.toBe(parentContext.establishedAt);

			// Should have fresh source matching current mode
			expect(childContext.source).toBe('trigger');
			expect(childContext.source).not.toBe(parentContext.source);

			// Should track parent execution ID
			expect(childContext.parentExecutionId).toBe('parent-execution-id');
		});

		it('should handle missing parent context gracefully', async () => {
			const parentExecution: RelatedExecution = {
				executionId: 'parent-execution-id',
				workflowId: 'parent-workflow-id',
				// executionContext is undefined
			};

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
				parentExecution,
			};

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'trigger',
			);

			const context = runExecutionData.executionData!.runtimeData!;

			// Should create basic context without inherited fields
			expect(context.version).toBe(1);
			expect(context.source).toBe('trigger');
			expect(context.establishedAt).toBeDefined();
			expect(context.parentExecutionId).toBe('parent-execution-id');
		});

		it('should inherit custom fields from parent context', async () => {
			const parentContext: IExecutionContext = {
				version: 1,
				establishedAt: 2000000000,
				source: 'webhook',
				credentials: 'parent-creds',
				// Custom field that should be inherited
				customField: 'custom-value',
			} as IExecutionContext & { customField: string };

			const parentExecution: RelatedExecution = {
				executionId: 'parent-id',
				workflowId: 'parent-wf-id',
				executionContext: parentContext,
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				parentExecution,
			};

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'manual');

			const childContext = runExecutionData.executionData!.runtimeData! as IExecutionContext & {
				customField: string;
			};

			// Custom fields should be inherited
			expect(childContext.customField).toBe('custom-value');
			expect(childContext.credentials).toBe('parent-creds');
		});

		it('should work with nested sub-workflows (grandchild)', async () => {
			// Parent context (already has parentExecutionId from grandparent)
			const parentContext: IExecutionContext = {
				version: 1,
				establishedAt: 2000000000,
				source: 'trigger',
				credentials: 'grandparent-credentials', // Inherited
				parentExecutionId: 'grandparent-execution-id',
			};

			const parentExecution: RelatedExecution = {
				executionId: 'parent-execution-id',
				workflowId: 'parent-workflow-id',
				executionContext: parentContext,
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				parentExecution,
			};

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'webhook',
			);

			const grandchildContext = runExecutionData.executionData!.runtimeData!;

			// Should inherit credentials from ancestor
			expect(grandchildContext.credentials).toBe('grandparent-credentials');

			// Should have fresh values
			expect(grandchildContext.source).toBe('webhook');
			expect(grandchildContext.establishedAt).toBeGreaterThan(parentContext.establishedAt);

			// Should track immediate parent
			expect(grandchildContext.parentExecutionId).toBe('parent-execution-id');
		});
	});

	describe('error workflow context inheritance', () => {
		it('should inherit context from start item metadata', async () => {
			const parentContext: IExecutionContext = {
				version: 1,
				establishedAt: 3000000000,
				source: 'trigger',
				credentials: 'original-workflow-credentials',
			};

			const errorTriggerNode = mock<INode>({
				name: 'ErrorTrigger',
				type: 'n8n-nodes-base.errorTrigger',
			});
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: errorTriggerNode,
							data: {
								main: [[{ json: { error: 'test error' } }]],
							},
							source: null,
							metadata: {
								parentExecution: {
									executionId: 'failed-execution-id',
									workflowId: 'failed-workflow-id',
									executionContext: parentContext,
								},
							},
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const beforeTimestamp = Date.now();
			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'error');
			const afterTimestamp = Date.now();

			const errorContext = runExecutionData.executionData!.runtimeData!;

			// Should inherit credentials from failed workflow
			expect(errorContext.credentials).toBe('original-workflow-credentials');

			// Should have fresh establishedAt
			expect(errorContext.establishedAt).toBeGreaterThanOrEqual(beforeTimestamp);
			expect(errorContext.establishedAt).toBeLessThanOrEqual(afterTimestamp);
			expect(errorContext.establishedAt).not.toBe(parentContext.establishedAt);

			// Should have 'error' as source
			expect(errorContext.source).toBe('error');
			expect(errorContext.source).not.toBe(parentContext.source);

			// Should track parent execution ID
			expect(errorContext.parentExecutionId).toBe('failed-execution-id');
		});

		it('should handle error workflow without parent context', async () => {
			const errorTriggerNode = mock<INode>({
				name: 'ErrorTrigger',
				type: 'n8n-nodes-base.errorTrigger',
			});
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: errorTriggerNode,
							data: {
								main: [[{ json: { error: 'test error' } }]],
							},
							source: null,
							// No metadata with parentExecution
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'error');

			const context = runExecutionData.executionData!.runtimeData!;

			// Should create basic context
			expect(context.version).toBe(1);
			expect(context.source).toBe('error');
			expect(context.establishedAt).toBeDefined();
			expect(context.parentExecutionId).toBeUndefined();
		});

		it('should inherit context when sub-workflow fails', async () => {
			// Sub-workflow already had inherited context from parent
			const subWorkflowContext: IExecutionContext = {
				version: 1,
				establishedAt: 4000000000,
				source: 'trigger',
				credentials: 'root-workflow-credentials',
				parentExecutionId: 'root-execution-id',
			};

			const errorTriggerNode = mock<INode>({
				name: 'ErrorTrigger',
				type: 'n8n-nodes-base.errorTrigger',
			});
			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							node: errorTriggerNode,
							data: {
								main: [[{ json: { error: 'sub-workflow error' } }]],
							},
							source: null,
							metadata: {
								parentExecution: {
									executionId: 'failed-sub-workflow-id',
									workflowId: 'sub-workflow-id',
									executionContext: subWorkflowContext,
								},
							},
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'error');

			const errorContext = runExecutionData.executionData!.runtimeData!;

			// Should inherit root credentials
			expect(errorContext.credentials).toBe('root-workflow-credentials');

			// Should track the failed sub-workflow
			expect(errorContext.parentExecutionId).toBe('failed-sub-workflow-id');

			// Should have fresh timing
			expect(errorContext.source).toBe('error');
			expect(errorContext.establishedAt).toBeGreaterThan(subWorkflowContext.establishedAt);
		});
	});

	describe('context propagation priority and edge cases', () => {
		it('should prefer runExecutionData.parentExecution over startItem.metadata', async () => {
			// Both sources provide context, runExecutionData.parentExecution should win
			const runDataParentContext: IExecutionContext = {
				version: 1,
				establishedAt: 5000000000,
				source: 'manual',
				credentials: 'rundata-credentials',
			};

			const metadataParentContext: IExecutionContext = {
				version: 1,
				establishedAt: 6000000000,
				source: 'trigger',
				credentials: 'metadata-credentials',
			};

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
							metadata: {
								parentExecution: {
									executionId: 'metadata-parent-id',
									workflowId: 'metadata-workflow-id',
									executionContext: metadataParentContext,
								},
							},
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				parentExecution: {
					executionId: 'rundata-parent-id',
					workflowId: 'rundata-workflow-id',
					executionContext: runDataParentContext,
				},
			};

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'webhook',
			);

			const context = runExecutionData.executionData!.runtimeData!;

			// Should use runExecutionData.parentExecution (higher priority)
			expect(context.credentials).toBe('rundata-credentials');
			expect(context.parentExecutionId).toBe('rundata-parent-id');
		});

		it('should handle empty parent execution object', async () => {
			const parentExecution: RelatedExecution = {
				executionId: '',
				workflowId: '',
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				parentExecution,
			};

			await establishExecutionContext(mockWorkflow, runExecutionData, mockAdditionalData, 'manual');

			const context = runExecutionData.executionData!.runtimeData!;

			// Should create context with empty parentExecutionId
			expect(context.version).toBe(1);
			expect(context.source).toBe('manual');
			expect(context.parentExecutionId).toBe('');
		});

		it('should not override existing runtimeData even with parent execution', async () => {
			const existingContext: IExecutionContext = {
				version: 1,
				establishedAt: 7000000000,
				source: 'webhook',
				credentials: 'existing-credentials',
			};

			const parentContext: IExecutionContext = {
				version: 1,
				establishedAt: 8000000000,
				source: 'manual',
				credentials: 'parent-credentials',
			};

			const runExecutionData: IRunExecutionData = {
				startData: {},
				resultData: {
					runData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
					runtimeData: existingContext, // Already exists
				},
				parentExecution: {
					executionId: 'parent-id',
					workflowId: 'parent-wf-id',
					executionContext: parentContext,
				},
			};

			await establishExecutionContext(
				mockWorkflow,
				runExecutionData,
				mockAdditionalData,
				'trigger',
			);

			// Existing context takes precedence (webhook resume scenario)
			expect(runExecutionData.executionData!.runtimeData).toEqual(existingContext);
			expect(runExecutionData.executionData!.runtimeData!.credentials).toBe('existing-credentials');
		});
	});
});
