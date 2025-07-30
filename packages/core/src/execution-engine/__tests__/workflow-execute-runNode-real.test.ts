/**
 * Tests for the actual WorkflowExecute.runNode method
 * These tests ensure the real implementation behavior is preserved during refactoring
 */

// Mock all external dependencies first, before any imports
jest.mock('@n8n/config', () => ({
	GlobalConfig: jest.fn().mockImplementation(() => ({
		sentry: { backendDsn: '' },
	})),
}));

jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn(),
	},
	Service: () => (target: any) => target,
}));

jest.mock('@/errors/error-reporter', () => ({
	ErrorReporter: function () {
		return {
			error: jest.fn(),
		};
	},
}));

jest.mock('@/utils/is-json-compatible', () => ({
	isJsonCompatible: jest.fn().mockReturnValue({ isValid: true }),
}));

jest.mock('../node-execution-context', () => ({
	ExecuteContext: jest.fn().mockImplementation(() => ({
		hints: [],
	})),
	PollContext: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../triggers-and-pollers', () => ({
	TriggersAndPollers: jest.fn(),
}));

jest.mock('../routing-node', () => ({
	RoutingNode: jest.fn().mockImplementation(() => ({
		runNode: jest.fn().mockResolvedValue([[{ json: { routed: 'result' } }]]),
	})),
}));

jest.mock('@/node-execute-functions', () => ({
	getExecuteTriggerFunctions: jest.fn(),
}));

// Now import the real classes
import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeType,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	CloseFunction,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeOperationError, Node } from 'n8n-workflow';
import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';

import { WorkflowExecute } from '../workflow-execute';
import { ExecuteContext, PollContext } from '../node-execution-context';
import { RoutingNode } from '../routing-node';
import { TriggersAndPollers } from '../triggers-and-pollers';

const mockContainer = Container as jest.Mocked<typeof Container>;
const mockExecuteContext = ExecuteContext as jest.MockedClass<typeof ExecuteContext>;
const mockPollContext = PollContext as jest.MockedClass<typeof PollContext>;
const mockRoutingNode = RoutingNode as jest.MockedClass<typeof RoutingNode>;

describe('WorkflowExecute.runNode - Real Implementation', () => {
	let workflowExecute: WorkflowExecute;
	let mockWorkflow: jest.Mocked<Workflow>;
	let mockAdditionalData: jest.Mocked<IWorkflowExecuteAdditionalData>;
	let mockRunExecutionData: IRunExecutionData;
	let mockNode: INode;
	let mockNodeType: jest.Mocked<INodeType>;
	let mockExecutionData: IExecuteData;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup Container mock for different dependencies
		const mockTriggersAndPollersInstance = {
			runTrigger: jest.fn(),
		};
		const mockGlobalConfigInstance = {
			sentry: { backendDsn: '' },
		};
		mockContainer.get.mockImplementation((token) => {
			if (token === GlobalConfig) {
				return mockGlobalConfigInstance;
			}
			if (token === TriggersAndPollers) {
				return mockTriggersAndPollersInstance;
			}
			// Default fallback
			return mockTriggersAndPollersInstance;
		});

		mockAdditionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: 'test-execution-id',
		});

		mockRunExecutionData = {
			startData: {},
			resultData: {
				runData: {},
				pinData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		mockNode = {
			id: 'test-node-id',
			name: 'Test Node',
			type: 'test-node',
			typeVersion: 1,
			position: [100, 200],
			parameters: {},
		};

		mockNodeType = mock<INodeType>({
			description: {
				displayName: 'Test Node',
				name: 'test-node',
				group: ['transform'],
				version: 1,
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				requestDefaults: undefined, // Explicitly set to undefined
			},
		});

		mockWorkflow = mock<Workflow>({
			nodeTypes: {
				getByNameAndVersion: jest.fn().mockReturnValue(mockNodeType),
			},
			settings: {
				executionOrder: 'v1',
			},
		});

		mockExecutionData = {
			node: mockNode,
			data: {
				main: [[{ json: { test: 'data' } }]],
			},
			source: null,
		};

		workflowExecute = new WorkflowExecute(mockAdditionalData, 'manual', mockRunExecutionData);
	});

	describe('disabled node handling', () => {
		it('should return undefined for disabled node with no input data', async () => {
			const disabledNode = { ...mockNode, disabled: true };
			const executionData = {
				...mockExecutionData,
				node: disabledNode,
				data: { main: [] },
			};

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(result).toEqual({ data: undefined });
		});

		it('should return undefined for disabled node with null main input', async () => {
			const disabledNode = { ...mockNode, disabled: true };
			const executionData = {
				...mockExecutionData,
				node: disabledNode,
				data: { main: [null] },
			};

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(result).toEqual({ data: undefined });
		});

		it('should pass through first main input data for disabled node', async () => {
			const disabledNode = { ...mockNode, disabled: true };
			const inputData = [{ json: { test: 'passthrough' } }];
			const executionData = {
				...mockExecutionData,
				node: disabledNode,
				data: { main: [inputData] },
			};

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(result).toEqual({ data: [inputData] });
		});
	});

	describe('error handling for previously failed nodes', () => {
		it('should rethrow NodeOperationError from previous execution', async () => {
			const error = new NodeOperationError(mockNode, 'Test error');
			const runDataWithError = {
				...mockRunExecutionData,
				resultData: {
					...mockRunExecutionData.resultData,
					lastNodeExecuted: mockNode.name,
					error,
				},
			};

			await expect(
				workflowExecute.runNode(
					mockWorkflow,
					mockExecutionData,
					runDataWithError,
					0,
					mockAdditionalData,
					'manual',
				),
			).rejects.toThrow(error);
		});

		it('should rethrow NodeApiError from previous execution', async () => {
			const error = new NodeApiError(mockNode, { message: 'API error' });
			const runDataWithError = {
				...mockRunExecutionData,
				resultData: {
					...mockRunExecutionData.resultData,
					lastNodeExecuted: mockNode.name,
					error,
				},
			};

			await expect(
				workflowExecute.runNode(
					mockWorkflow,
					mockExecutionData,
					runDataWithError,
					0,
					mockAdditionalData,
					'manual',
				),
			).rejects.toThrow(error);
		});

		it('should throw generic Error for other error types from previous execution', async () => {
			const originalError = {
				message: 'Generic error',
				stack: 'error stack',
				name: 'SomeOtherError',
			};
			const runDataWithError = {
				...mockRunExecutionData,
				resultData: {
					...mockRunExecutionData.resultData,
					lastNodeExecuted: mockNode.name,
					error: originalError,
				},
			};

			await expect(
				workflowExecute.runNode(
					mockWorkflow,
					mockExecutionData,
					runDataWithError,
					0,
					mockAdditionalData,
					'manual',
				),
			).rejects.toThrow('Generic error');
		});
	});

	describe('execute node type handling', () => {
		it('should execute node with execute method and return data with hints', async () => {
			const mockData = [[{ json: { result: 'test' } }]];
			const mockHints = [{ message: 'Test hint' }];
			mockNodeType.execute = jest.fn().mockResolvedValue(mockData);

			const mockContextInstance = {
				hints: mockHints,
			};
			mockExecuteContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(mockNodeType.execute).toHaveBeenCalled();
			expect(result).toEqual({ data: mockData, hints: mockHints });
		});

		it('should execute Node class instance with execute method', async () => {
			const mockData = [[{ json: { result: 'test' } }]];
			const nodeInstance = new Node();
			nodeInstance.execute = jest.fn().mockResolvedValue(mockData);
			nodeInstance.description = {
				displayName: 'Node Instance',
				name: 'node-instance',
				group: ['transform'],
				version: 1,
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				requestDefaults: undefined,
			};
			mockWorkflow.nodeTypes.getByNameAndVersion.mockReturnValue(nodeInstance as any);

			const mockContextInstance = { hints: [] };
			mockExecuteContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(nodeInstance.execute).toHaveBeenCalledWith(mockContextInstance);
			expect(result).toEqual({ data: mockData, hints: [] });
		});

		it('should return undefined when no connection input data for execute nodes', async () => {
			const executionData = {
				...mockExecutionData,
				data: { main: [] }, // No input data
			};

			mockNodeType.execute = jest.fn();

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(result).toEqual({ data: undefined });
			expect(mockNodeType.execute).not.toHaveBeenCalled();
		});

		it('should handle close functions and their errors', async () => {
			const mockData = [[{ json: { result: 'test' } }]];
			const closeFunction1 = jest.fn().mockResolvedValue(undefined);
			const closeFunction2 = jest.fn().mockRejectedValue(new Error('Close error'));

			mockNodeType.execute = jest.fn().mockResolvedValue(mockData);

			const mockContextInstance = {
				hints: [],
			};

			// Mock ExecuteContext constructor to capture closeFunctions array
			mockExecuteContext.mockImplementation(
				(
					workflow,
					node,
					additionalData,
					mode,
					runExecutionData,
					runIndex,
					connectionInputData,
					inputData,
					executionData,
					closeFunctions,
				) => {
					// Add close functions to the array passed in
					closeFunctions.push(closeFunction1, closeFunction2);
					return mockContextInstance as any;
				},
			);

			await expect(
				workflowExecute.runNode(
					mockWorkflow,
					mockExecutionData,
					mockRunExecutionData,
					0,
					mockAdditionalData,
					'manual',
				),
			).rejects.toThrow('Close error');

			expect(closeFunction1).toHaveBeenCalled();
			expect(closeFunction2).toHaveBeenCalled();
		});
	});

	describe('poll node type handling', () => {
		it('should execute poll function in manual mode', async () => {
			const mockData = [[{ json: { polled: 'data' } }]];
			mockNodeType.poll = jest.fn().mockResolvedValue(mockData);
			mockNodeType.execute = undefined;

			const mockContextInstance = {};
			mockPollContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(mockPollContext).toHaveBeenCalledWith(
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				'manual',
				'manual',
			);
			expect(mockNodeType.poll).toHaveBeenCalledWith();
			expect(result).toEqual({ data: mockData });
		});

		it('should pass through input data for poll nodes in non-manual mode', async () => {
			mockNodeType.poll = jest.fn();
			mockNodeType.execute = undefined;

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'trigger', // Non-manual mode
			);

			expect(mockNodeType.poll).not.toHaveBeenCalled();
			expect(result).toEqual({ data: mockExecutionData.data.main });
		});
	});

	describe('trigger node type handling', () => {
		it('should run trigger in manual mode and return data', async () => {
			const mockTriggerData = [[{ json: { triggered: 'data' } }]];
			const mockTriggerResponse = {
				manualTriggerResponse: Promise.resolve(mockTriggerData),
			};

			mockNodeType.trigger = jest.fn();
			mockNodeType.execute = undefined;
			mockNodeType.poll = undefined;
			mockNodeType.webhook = undefined;

			const mockTriggersAndPollersInstance = {
				runTrigger: jest.fn().mockResolvedValue(mockTriggerResponse),
			};
			const mockGlobalConfigInstance = {
				sentry: { backendDsn: '' },
			};
			mockContainer.get.mockImplementation((token) => {
				if (token === GlobalConfig) {
					return mockGlobalConfigInstance;
				}
				if (token === TriggersAndPollers) {
					return mockTriggersAndPollersInstance;
				}
				return mockTriggersAndPollersInstance;
			});

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(mockTriggersAndPollersInstance.runTrigger).toHaveBeenCalled();
			expect(result).toEqual({ data: mockTriggerData });
		});

		it('should pass through input data for trigger nodes in non-manual mode', async () => {
			mockNodeType.trigger = jest.fn();
			mockNodeType.execute = undefined;

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'trigger', // Non-manual mode
			);

			expect(result).toEqual({ data: mockExecutionData.data.main });
		});
	});

	describe('webhook node type handling', () => {
		it('should pass through input data for non-declarative webhook nodes', async () => {
			mockNodeType.webhook = jest.fn();
			mockNodeType.execute = undefined;
			mockNodeType.poll = undefined;
			mockNodeType.trigger = undefined;
			mockNodeType.description.requestDefaults = undefined; // Non-declarative

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(result).toEqual({ data: mockExecutionData.data.main });
		});

		it('should execute declarative webhook nodes through routing node', async () => {
			const mockData = [[{ json: { webhook: 'result' } }]];
			mockNodeType.webhook = jest.fn();
			mockNodeType.execute = undefined;
			mockNodeType.poll = undefined;
			mockNodeType.trigger = undefined;
			mockNodeType.description.requestDefaults = {}; // Declarative node

			const mockRoutingNodeInstance = {
				runNode: jest.fn().mockResolvedValue(mockData),
			};
			mockRoutingNode.mockImplementation(() => mockRoutingNodeInstance as any);

			const mockContextInstance = {};
			mockExecuteContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(mockRoutingNode).toHaveBeenCalledWith(mockContextInstance, mockNodeType);
			expect(mockRoutingNodeInstance.runNode).toHaveBeenCalled();
			expect(result).toEqual({ data: mockData });
		});
	});

	describe('fallback routing node handling', () => {
		it('should use routing node for nodes without specific execution methods', async () => {
			const mockData = [[{ json: { routed: 'result' } }]];
			// Node with no execute, poll, trigger, or webhook methods
			mockNodeType.execute = undefined;
			mockNodeType.poll = undefined;
			mockNodeType.trigger = undefined;
			mockNodeType.webhook = undefined;

			const mockRoutingNodeInstance = {
				runNode: jest.fn().mockResolvedValue(mockData),
			};
			mockRoutingNode.mockImplementation(() => mockRoutingNodeInstance as any);

			const mockContextInstance = {};
			mockExecuteContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				mockExecutionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			expect(mockRoutingNode).toHaveBeenCalledWith(mockContextInstance, mockNodeType);
			expect(mockRoutingNodeInstance.runNode).toHaveBeenCalled();
			expect(result).toEqual({ data: mockData });
		});
	});

	describe('execution order and input data handling', () => {
		it('should use first main input for v1 execution order when forceInputNodeExecution is false', async () => {
			mockWorkflow.settings.executionOrder = 'v1'; // v1 means forceInputNodeExecution = false
			const inputData = [
				[], // Empty first input
				[{ json: { item: 2 } }], // Non-empty second input
				[{ json: { item: 3 } }],
			];
			const executionData = {
				...mockExecutionData,
				data: { main: inputData },
			};

			mockNodeType.execute = jest.fn().mockResolvedValue([[{ json: { result: 'test' } }]]);

			const mockContextInstance = { hints: [] };
			mockExecuteContext.mockImplementation(() => mockContextInstance as any);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			// Should find the first non-empty input and execute
			expect(result).toEqual({ data: [[{ json: { result: 'test' } }]], hints: [] });
		});

		it('should use first main input for v0 execution order when forceInputNodeExecution is true', async () => {
			mockWorkflow.settings.executionOrder = 'v0'; // v0 means forceInputNodeExecution = true
			const inputData = [
				[], // Empty first input
				[{ json: { item: 2 } }], // Non-empty second input
				[{ json: { item: 3 } }],
			];
			const executionData = {
				...mockExecutionData,
				data: { main: inputData },
			};

			mockNodeType.execute = jest.fn().mockResolvedValue([[{ json: { result: 'test' } }]]);

			const result = await workflowExecute.runNode(
				mockWorkflow,
				executionData,
				mockRunExecutionData,
				0,
				mockAdditionalData,
				'manual',
			);

			// Should return undefined because first input is empty and we use first input in v0
			expect(result).toEqual({ data: undefined });
		});
	});
});
