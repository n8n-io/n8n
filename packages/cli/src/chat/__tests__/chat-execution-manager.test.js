'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_runner_1 = require('@/workflow-runner');
const node_types_1 = require('../../node-types');
const ownership_service_1 = require('../../services/ownership.service');
const chat_execution_manager_1 = require('../chat-execution-manager');
describe('ChatExecutionManager', () => {
	const executionRepository = (0, backend_test_utils_1.mockInstance)(db_1.ExecutionRepository);
	const workflowRunner = (0, backend_test_utils_1.mockInstance)(workflow_runner_1.WorkflowRunner);
	const ownershipService = (0, backend_test_utils_1.mockInstance)(
		ownership_service_1.OwnershipService,
	);
	const nodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
	const chatExecutionManager = new chat_execution_manager_1.ChatExecutionManager(
		executionRepository,
		workflowRunner,
		ownershipService,
		nodeTypes,
	);
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	it('should handle errors from getRunData gracefully', async () => {
		const execution = { id: '1', workflowData: {}, data: {} };
		const message = { sessionId: '123', action: 'sendMessage', chatInput: 'input' };
		jest.spyOn(chatExecutionManager, 'getRunData').mockRejectedValue(new Error('Test error'));
		await expect(chatExecutionManager.runWorkflow(execution, message)).rejects.toThrow(
			'Test error',
		);
	});
	describe('runWorkflow', () => {
		it('should call WorkflowRunner.run with correct parameters', async () => {
			const execution = { id: '1', workflowData: {}, data: {} };
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			};
			const runData = { executionMode: 'manual', executionData: {}, workflowData: {} };
			jest.spyOn(chatExecutionManager, 'getRunData').mockResolvedValue(runData);
			await chatExecutionManager.runWorkflow(execution, message);
			expect(workflowRunner.run).toHaveBeenCalledWith(runData, true, true, '1');
		});
	});
	describe('cancelExecution', () => {
		it('should update execution status to canceled if it is running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'running' };
			executionRepository.findSingleExecution.mockResolvedValue(execution);
			await chatExecutionManager.cancelExecution(executionId);
			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});
		it('should update execution status to canceled if it is waiting', async () => {
			const executionId = '2';
			const execution = { id: executionId, status: 'waiting' };
			executionRepository.findSingleExecution.mockResolvedValue(execution);
			await chatExecutionManager.cancelExecution(executionId);
			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});
		it('should update execution status to canceled if it is unknown', async () => {
			const executionId = '3';
			const execution = { id: executionId, status: 'unknown' };
			executionRepository.findSingleExecution.mockResolvedValue(execution);
			await chatExecutionManager.cancelExecution(executionId);
			expect(executionRepository.update).toHaveBeenCalledWith(
				{ id: executionId },
				{ status: 'canceled' },
			);
		});
		it('should not update execution status if it is not running', async () => {
			const executionId = '1';
			const execution = { id: executionId, status: 'completed' };
			executionRepository.findSingleExecution.mockResolvedValue(execution);
			await chatExecutionManager.cancelExecution(executionId);
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
			const execution = { id: executionId };
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
			};
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			};
			const project = { id: 'projectId' };
			const nodeExecutionData = [[{ json: message }]];
			const getRunDataSpy = jest
				.spyOn(chatExecutionManager, 'runNode')
				.mockResolvedValue(nodeExecutionData);
			const getWorkflowProjectCachedSpy = jest
				.spyOn(ownershipService, 'getWorkflowProjectCached')
				.mockResolvedValue(project);
			const runData = await chatExecutionManager.getRunData(execution, message);
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
					executionData: { nodeExecutionStack: [{ data: { main: [[]] } }] },
				},
				mode: 'manual',
			};
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			};
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({});
			const workflow = { getNode: jest.fn().mockReturnValue(null) };
			jest.spyOn(chatExecutionManager, 'getWorkflow').mockReturnValue(workflow);
			const result = await chatExecutionManager.runNode(execution, message);
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
			};
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			};
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({});
			const workflow = { getNode: jest.fn().mockReturnValue({}) };
			jest.spyOn(chatExecutionManager, 'getWorkflow').mockReturnValue(workflow);
			const result = await chatExecutionManager.runNode(execution, message);
			expect(result).toBeNull();
		});
		it('should call nodeType.onMessage with correct parameters and return the result', async () => {
			const execution = {
				id: '1',
				workflowData: { id: 'workflowId' },
				data: {
					resultData: { lastNodeExecuted: 'nodeId' },
					executionData: { nodeExecutionStack: [{ data: { main: [[{}]] } }] },
				},
				mode: 'manual',
			};
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
				files: [],
			};
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
			};
			jest.spyOn(chatExecutionManager, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({});
			const result = await chatExecutionManager.runNode(execution, message);
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
					executionData: { nodeExecutionStack: [{ data: { main: [[{}]] } }] },
				},
				mode: 'manual',
			};
			const message = {
				sessionId: '123',
				action: 'sendMessage',
				chatInput: 'input',
			};
			const node = { type: 'testType', typeVersion: 1 };
			const nodeType = { onMessage: jest.fn().mockResolvedValue([[{ json: message }]]) };
			const workflow = {
				getNode: jest.fn().mockReturnValue(node),
				nodeTypes: { getByNameAndVersion: jest.fn().mockReturnValue(nodeType) },
			};
			jest.spyOn(chatExecutionManager, 'getWorkflow').mockReturnValue(workflow);
			jest.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue({});
			const result = await chatExecutionManager.runNode(execution, message);
			expect(result).toEqual([[{ json: message }]]);
		});
	});
});
//# sourceMappingURL=chat-execution-manager.test.js.map
