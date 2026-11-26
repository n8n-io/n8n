import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse } from '@n8n/db';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';
import { mockInstance } from '@n8n/backend-test-utils';
import { RESPOND_TO_CHAT_NODE_TYPE, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

import { NodeTypes } from '../../node-types';
import { OwnershipService } from '../../services/ownership.service';
import { ChatExecutionManager } from '../chat-execution-manager';
import type { ChatMessage } from '../chat-service.types';

describe('ChatExecutionManager', () => {
	const executionRepository = mockInstance(ExecutionRepository);
	const workflowRunner = mockInstance(WorkflowRunner);
	const ownershipService = mockInstance(OwnershipService);
	const nodeTypes = mockInstance(NodeTypes);
	const chatExecutionManager = new ChatExecutionManager(
		executionRepository,
		workflowRunner,
		ownershipService,
		nodeTypes,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('should handle errors from getRunData gracefully', async () => {
		const execution = { id: '1', workflowData: {}, data: {} } as IExecutionResponse;
		const message = { sessionId: '123', action: 'sendMessage', chatInput: 'input' } as ChatMessage;

		jest
			.spyOn(chatExecutionManager as any, 'getRunData')
			.mockRejectedValue(new Error('Test error'));

		await expect(chatExecutionManager.runWorkflow(execution, message)).rejects.toThrow(
			'Test error',
		);
	});

	describe('runWorkflow', () => {
		it('should call WorkflowRunner.run with correct parameters', async () => {
			const execution = { id: '1', workflowData: {}, data: {} } as IExecutionResponse;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const runData = { executionMode: 'manual', executionData: {}, workflowData: {} } as any;

			jest.spyOn(chatExecutionManager as any, 'getRunData').mockResolvedValue(runData);

			await chatExecutionManager.runWorkflow(execution, message);

			expect(workflowRunner.run).toHaveBeenCalledWith(runData, true, true, '1');
		});
	});

	describe('cancelExecution', () => {
		beforeEach(() => {
			// The status-transition tests below exercise the cancel logic itself; the
			// chat-ownership gate is covered by its own tests. Treat the execution as
			// chat-driven so these focus on status handling.
			jest.spyOn(chatExecutionManager, 'canResumeOverChat').mockReturnValue(true);
		});

		it('should update execution status to canceled if it is running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'running' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should update execution status to canceled if it is waiting', async () => {
			const executionId = '2';
			const execution = { id: executionId, status: 'waiting' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should update execution status to canceled if it is unknown', async () => {
			const executionId = '3';
			const execution = { id: executionId, status: 'unknown' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});

		it('should not update execution status if it is not running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'completed' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).not.toHaveBeenCalled();
		});

		it('should not cancel a waiting execution the chat socket does not drive', async () => {
			// A socket attached to a non-chat execution (e.g. a Send-and-Wait gate)
			// must not cancel it by going idle.
			jest.spyOn(chatExecutionManager, 'canResumeOverChat').mockReturnValue(false);
			const executionId = '9';
			const execution = { id: executionId, status: 'waiting' } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await chatExecutionManager.cancelExecution(executionId);

			expect(executionRepository.update).not.toHaveBeenCalled();
		});

		it('does not throw or cancel when the parked node type is unresolvable', async () => {
			// Use the real guard (the beforeEach stubs it) so the resolution failure is
			// exercised: it must be swallowed, so the heartbeat loop can still clean up.
			jest.spyOn(chatExecutionManager, 'canResumeOverChat').mockRestore();
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockImplementation(() => {
				throw new Error('Unrecognized node type: some.uninstalled.node');
			});
			const execution = {
				id: '9',
				status: 'waiting',
				workflowData: { id: 'wf', nodes: [] },
				data: {
					executionData: {
						nodeExecutionStack: [{ node: { name: 'X', type: 'x' }, data: { main: [[]] } }],
					},
				},
			} as any;
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			await expect(chatExecutionManager.cancelExecution('9')).resolves.toBeUndefined();
			expect(executionRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('findExecution', () => {
		it('should return undefined if execution does not exist', async () => {
			const executionId = 'non-existent';

			executionRepository.findSingleExecution.mockResolvedValue(undefined);

			const result = await chatExecutionManager.findExecution(executionId);

			expect(result).toBeUndefined;
		});

		it('should return execution data', async () => {
			const executionId = '1';
			const execution = { id: executionId } as any;

			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const result = await chatExecutionManager.findExecution(executionId);

			expect(result).toEqual(execution);
		});
	});

	describe('getRunData', () => {
		it('should call runNode with correct parameters and return runData', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { pinData: {} },
					executionData: { nodeExecutionStack: [{ data: { main: [[]] } }] },
					pushRef: 'pushRef',
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const project = { id: 'projectId' };
			const nodeExecutionData = [[{ json: message }]];

			const getRunDataSpy = jest
				.spyOn(chatExecutionManager as any, 'runNode')
				.mockResolvedValue(nodeExecutionData);
			const getWorkflowProjectCachedSpy = jest
				.spyOn(ownershipService, 'getWorkflowProjectCached')
				.mockResolvedValue(project as any);

			const runData = await (chatExecutionManager as any).getRunData(execution, message);

			expect(getRunDataSpy).toHaveBeenCalledWith(execution, message);
			expect(getWorkflowProjectCachedSpy).toHaveBeenCalledWith('workflowId');
			expect(runData).toEqual({
				executionMode: 'manual',
				executionData: execution.data,
				pushRef: execution.data.pushRef,
				workflowData: execution.workflowData,
				pinData: execution.data.resultData.pinData,
				projectId: 'projectId',
			});
		});
	});

	describe('runNode', () => {
		it('should return null if node is not found', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: {
						nodeExecutionStack: [{ node: { name: 'nodeId' }, data: { main: [[]] } }],
					},
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const workflow = { getNode: jest.fn().mockReturnValue(null) };
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toBeNull();
		});

		it('should return null if executionData is undefined', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [] },
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;

			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);
			const workflow = { getNode: jest.fn().mockReturnValue({}) };
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toBeNull();
		});

		it('should call nodeType.onMessage with correct parameters and return the result', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: {
						nodeExecutionStack: [{ node: { name: 'nodeId' }, data: { main: [[{}]] } }],
					},
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
				files: [],
			} as ChatMessage;
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
				expression: {
					acquireIsolate: jest.fn().mockResolvedValue(undefined),
					releaseIsolate: jest.fn().mockResolvedValue(undefined),
				},
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(workflow.nodeTypes.getByNameAndVersion).toHaveBeenCalledWith('testType', 1);
			expect(nodeType.onMessage).toHaveBeenCalled();
			expect(result).toEqual([[{ json: message }]]);
		});

		it('should return nodeExecutionData with sessionId, action and chatInput', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: {
						nodeExecutionStack: [{ node: { name: 'nodeId' }, data: { main: [[{}]] } }],
					},
				},
				mode: 'manual',
			} as any;
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			} as ChatMessage;
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
				expression: {
					acquireIsolate: jest.fn().mockResolvedValue(undefined),
					releaseIsolate: jest.fn().mockResolvedValue(undefined),
				},
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({} as any);

			const result = await (chatExecutionManager as any).runNode(execution, message);

			expect(result).toEqual([[{ json: message }]]);
		});
	});

	describe('canResumeOverChat', () => {
		// A chat message may only resume a node whose resolved type implements the
		// onMessage hook. Everything else (Send-and-Wait gates, Wait, forms) must be
		// refused.
		function makeExecution(
			nodeType: string,
			parameters: Record<string, unknown> = {},
			nodeName = 'parkedNode',
		): IExecutionResponse {
			const node = { name: nodeName, type: nodeType, typeVersion: 1, parameters };
			return {
				id: '1',
				workflowData: { id: 'wf', nodes: [node] },
				data: {
					resultData: { lastNodeExecuted: nodeName, runData: {} },
					executionData: { nodeExecutionStack: [{ node, data: { main: [[]] } }] },
				},
			} as unknown as IExecutionResponse;
		}

		function mockWorkflow(execution: IExecutionResponse, hasOnMessage: boolean) {
			const node = execution.data.executionData!.nodeExecutionStack[0].node;
			const workflow = {
				id: 'wf',
				getNode: (name: string) => (name === node.name ? node : null),
				nodeTypes: {
					getByNameAndVersion: () => (hasOnMessage ? { onMessage: jest.fn() } : {}),
				},
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);
		}

		it('allows a chat node that implements onMessage', () => {
			const execution = makeExecution(RESPOND_TO_CHAT_NODE_TYPE);
			mockWorkflow(execution, true);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(true);
		});

		it('allows the chat tool (inherits onMessage)', () => {
			const execution = makeExecution('@n8n/n8n-nodes-langchain.chatTool');
			mockWorkflow(execution, true);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(true);
		});

		it('allows RespondToWebhook (implements onMessage)', () => {
			const execution = makeExecution(RESPOND_TO_WEBHOOK_NODE_TYPE);
			mockWorkflow(execution, true);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(true);
		});

		it('returns false (does not throw) when node type resolution fails', () => {
			const execution = makeExecution(RESPOND_TO_CHAT_NODE_TYPE);
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockImplementation(() => {
				throw new Error('Unrecognized node type: some.uninstalled.node');
			});

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(false);
		});

		it('refuses a Send-and-Wait node (no onMessage)', () => {
			const execution = makeExecution('n8n-nodes-base.telegram', { operation: 'sendAndWait' });
			mockWorkflow(execution, false);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(false);
		});

		it('refuses a plain Wait node (no onMessage)', () => {
			const execution = makeExecution('n8n-nodes-base.wait', { resume: 'timeInterval' });
			mockWorkflow(execution, false);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(false);
		});

		it('keys off the parked stack node, not lastNodeExecuted', () => {
			// lastNodeExecuted names a chat decoy, but the node the engine would resume
			// (nodeExecutionStack[0]) is a Telegram gate. The decision must follow the
			// parked stack node and refuse.
			const decoy = {
				name: 'Decoy',
				type: RESPOND_TO_CHAT_NODE_TYPE,
				typeVersion: 1,
				parameters: {},
			};
			const gate = {
				name: 'Manager approval',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1,
				parameters: { operation: 'sendAndWait' },
			};
			const execution = {
				id: '1',
				workflowData: { id: 'wf', nodes: [decoy, gate] },
				data: {
					resultData: { lastNodeExecuted: 'Decoy', runData: {} },
					executionData: { nodeExecutionStack: [{ node: gate, data: { main: [[]] } }] },
				},
			} as unknown as IExecutionResponse;
			const workflow = {
				getNode: (name: string) => (name === 'Decoy' ? decoy : name === gate.name ? gate : null),
				nodeTypes: {
					getByNameAndVersion: (type: string) =>
						type === RESPOND_TO_CHAT_NODE_TYPE ? { onMessage: jest.fn() } : {},
				},
			};
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue(workflow);

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(false);
		});

		it('refuses when there is no parked execution data', () => {
			const execution = {
				id: '1',
				workflowData: { id: 'wf', nodes: [] },
				data: { resultData: { lastNodeExecuted: 'x', runData: {} }, executionData: undefined },
			} as unknown as IExecutionResponse;
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue({
				getNode: () => null,
				nodeTypes: { getByNameAndVersion: () => ({ onMessage: jest.fn() }) },
			});

			expect(chatExecutionManager.canResumeOverChat(execution)).toBe(false);
		});
	});

	describe('resolveResumeNodeType', () => {
		it('reports the type of the parked node', () => {
			const node = {
				name: 'Manager approval',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1,
				parameters: {},
			};
			const execution = {
				id: '1',
				workflowData: { id: 'wf', nodes: [node] },
				data: {
					resultData: { lastNodeExecuted: node.name, runData: {} },
					executionData: { nodeExecutionStack: [{ node, data: { main: [[]] } }] },
				},
			} as unknown as IExecutionResponse;
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockReturnValue({
				getNode: (name: string) => (name === node.name ? node : null),
				nodeTypes: { getByNameAndVersion: () => ({}) },
			});

			expect(chatExecutionManager.resolveResumeNodeType(execution)).toBe('n8n-nodes-base.telegram');
		});

		it('returns undefined when the node type cannot be resolved', () => {
			const execution = {
				id: '1',
				data: {
					executionData: { nodeExecutionStack: [{ node: { name: 'x', type: 'x' }, data: {} }] },
				},
			} as unknown as IExecutionResponse;
			jest.spyOn(chatExecutionManager as any, 'getWorkflow').mockImplementation(() => {
				throw new Error('Unrecognized node type');
			});

			expect(chatExecutionManager.resolveResumeNodeType(execution)).toBeUndefined();
		});
	});
});
