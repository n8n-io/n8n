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
const jest_mock_extended_1 = require('jest-mock-extended');
const core = __importStar(require('n8n-core'));
const n8n_core_1 = require('n8n-core');
const manual_execution_service_1 = require('@/manual-execution.service');
jest.mock('n8n-core');
describe('ManualExecutionService', () => {
	const manualExecutionService = new manual_execution_service_1.ManualExecutionService(
		(0, jest_mock_extended_1.mock)(),
	);
	describe('getExecutionStartNode', () => {
		it('Should return undefined', () => {
			const data = (0, jest_mock_extended_1.mock)();
			const workflow = (0, jest_mock_extended_1.mock)({
				getTriggerNodes() {
					return [];
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode).toBeUndefined();
		});
		it('Should return startNode', () => {
			const data = (0, jest_mock_extended_1.mock)({
				pinData: {
					node1: [(0, jest_mock_extended_1.mock)()],
					node2: [(0, jest_mock_extended_1.mock)()],
				},
				startNodes: [{ name: 'node2' }],
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode(nodeName) {
					if (nodeName === 'node2') {
						return (0, jest_mock_extended_1.mock)({ name: 'node2' });
					}
					return null;
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toEqual('node2');
		});
		it('Should return triggerToStartFrom trigger node', () => {
			const data = (0, jest_mock_extended_1.mock)({
				pinData: {
					node1: [(0, jest_mock_extended_1.mock)()],
					node2: [(0, jest_mock_extended_1.mock)()],
				},
				triggerToStartFrom: { name: 'node3' },
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode(nodeName) {
					return (0, jest_mock_extended_1.mock)({ name: nodeName });
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toEqual('node3');
		});
		it('should return undefined, even if manual trigger node is available', () => {
			const scheduleTrigger = (0, jest_mock_extended_1.mock)({
				type: 'n8n-nodes-base.scheduleTrigger',
				name: 'Wed 12:00',
			});
			const manualTrigger = (0, jest_mock_extended_1.mock)({
				type: 'n8n-nodes-base.manualTrigger',
				name: 'When clicking ‘Execute workflow’',
			});
			const data = (0, jest_mock_extended_1.mock)({
				startNodes: [scheduleTrigger],
				triggerToStartFrom: undefined,
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getTriggerNodes() {
					return [scheduleTrigger, manualTrigger];
				},
			});
			const executionStartNode = manualExecutionService.getExecutionStartNode(data, workflow);
			expect(executionStartNode?.name).toBeUndefined();
		});
	});
	describe('runManually', () => {
		const nodeExecutionStack = (0, jest_mock_extended_1.mock)();
		const waitingExecution = (0, jest_mock_extended_1.mock)();
		const waitingExecutionSource = (0, jest_mock_extended_1.mock)();
		const mockFilteredGraph = (0, jest_mock_extended_1.mock)();
		beforeEach(() => {
			jest
				.spyOn(n8n_core_1.DirectedGraph, 'fromWorkflow')
				.mockReturnValue((0, jest_mock_extended_1.mock)());
			jest.spyOn(core, 'WorkflowExecute').mockReturnValue(
				(0, jest_mock_extended_1.mock)({
					processRunExecutionData: jest.fn().mockReturnValue((0, jest_mock_extended_1.mock)()),
				}),
			);
			jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValue({
				nodeExecutionStack,
				waitingExecution,
				waitingExecutionSource,
			});
			jest.spyOn(core, 'filterDisabledNodes').mockReturnValue(mockFilteredGraph);
		});
		afterEach(() => {
			jest.resetAllMocks();
		});
		it('should correctly process triggerToStartFrom data when data.triggerToStartFrom.data is present', async () => {
			const mockTriggerData = (0, jest_mock_extended_1.mock)();
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const data = (0, jest_mock_extended_1.mock)({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
				pinData: undefined,
			});
			const startNode = (0, jest_mock_extended_1.mock)({ name: startNodeName });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const pinData = {};
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);
			expect(n8n_core_1.DirectedGraph.fromWorkflow).toHaveBeenCalledWith(workflow);
			expect(n8n_core_1.recreateNodeExecutionStack).toHaveBeenCalledWith(
				mockFilteredGraph,
				new Set([startNode]),
				{ [triggerNodeName]: [mockTriggerData] },
				{},
			);
			expect(n8n_core_1.WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					resultData: {
						runData: { [triggerNodeName]: [mockTriggerData] },
						pinData,
					},
					executionData: {
						contextData: {},
						metadata: {},
						nodeExecutionStack,
						waitingExecution,
						waitingExecutionSource,
					},
				}),
			);
		});
		it('should correctly include destinationNode in executionData when provided', async () => {
			const mockTriggerData = (0, jest_mock_extended_1.mock)();
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const destinationNodeName = 'destinationNode';
			const data = (0, jest_mock_extended_1.mock)({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
				destinationNode: destinationNodeName,
			});
			const startNode = (0, jest_mock_extended_1.mock)({ name: startNodeName });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const pinData = {};
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);
			expect(n8n_core_1.WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					startData: {
						destinationNode: destinationNodeName,
					},
					resultData: expect.any(Object),
					executionData: expect.any(Object),
				}),
			);
		});
		it('should call workflowExecute.run for full execution when no runData or startNodes', async () => {
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				destinationNode: undefined,
				pinData: undefined,
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn().mockReturnValue(null),
				getTriggerNodes: jest.fn().mockReturnValue([]),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));
			await manualExecutionService.runManually(data, workflow, additionalData, executionId);
			expect(mockRun.mock.calls[0][0]).toBe(workflow);
			expect(mockRun.mock.calls[0][1]).toBeUndefined();
			expect(mockRun.mock.calls[0][2]).toBeUndefined();
			expect(mockRun.mock.calls[0][3]).toBeUndefined();
		});
		it('should use execution start node when available for full execution', async () => {
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				pinData: {},
				startNodes: [],
				destinationNode: undefined,
			});
			const startNode = (0, jest_mock_extended_1.mock)({ name: 'startNode' });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn().mockReturnValue(startNode),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const emptyPinData = {};
			jest.spyOn(manualExecutionService, 'getExecutionStartNode').mockReturnValue(startNode);
			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				emptyPinData,
			);
			expect(manualExecutionService.getExecutionStartNode).toHaveBeenCalledWith(data, workflow);
			expect(mockRun.mock.calls[0][0]).toBe(workflow);
			expect(mockRun.mock.calls[0][1]).toBe(startNode);
			expect(mockRun.mock.calls[0][2]).toBeUndefined();
			expect(mockRun.mock.calls[0][3]).toBe(data.pinData);
		});
		it('should pass the triggerToStartFrom to workflowExecute.run for full execution', async () => {
			const mockTriggerData = (0, jest_mock_extended_1.mock)();
			const triggerNodeName = 'triggerNode';
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				destinationNode: undefined,
				pinData: undefined,
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
			});
			const startNode = (0, jest_mock_extended_1.mock)({ name: 'startNode' });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn().mockReturnValue(startNode),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			jest.spyOn(manualExecutionService, 'getExecutionStartNode').mockReturnValue(startNode);
			const mockRun = jest.fn().mockReturnValue('mockRunReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
			}));
			await manualExecutionService.runManually(data, workflow, additionalData, executionId);
			expect(mockRun).toHaveBeenCalledWith(
				workflow,
				startNode,
				undefined,
				undefined,
				data.triggerToStartFrom,
			);
		});
		it('should handle partial execution with provided runData, startNodes and no destinationNode', async () => {
			const mockRunData = { node1: [{ data: { main: [[{ json: {} }]] } }] };
			const startNodeName = 'node1';
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [{ name: startNodeName }],
				destinationNode: undefined,
				pinData: undefined,
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === startNodeName)
						return (0, jest_mock_extended_1.mock)({ name: startNodeName });
					return null;
				}),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const mockRunPartialWorkflow = jest.fn().mockReturnValue('mockPartialReturn');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow: mockRunPartialWorkflow,
				processRunExecutionData: jest.fn(),
			}));
			await manualExecutionService.runManually(data, workflow, additionalData, executionId);
			expect(mockRunPartialWorkflow).toHaveBeenCalledWith(
				workflow,
				mockRunData,
				data.startNodes,
				undefined,
				undefined,
			);
		});
		it('should handle partial execution with partialExecutionVersion=2', async () => {
			const mockRunData = { node1: [{ data: { main: [[{ json: {} }]] } }] };
			const dirtyNodeNames = ['node2', 'node3'];
			const destinationNodeName = 'destinationNode';
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [{ name: 'node1' }],
				partialExecutionVersion: 2,
				dirtyNodeNames,
				destinationNode: destinationNodeName,
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => (0, jest_mock_extended_1.mock)({ name })),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			const pinData = { node1: [{ json: { pinned: true } }] };
			const mockRunPartialWorkflow2 = jest.fn().mockReturnValue('mockPartial2Return');
			require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow2: mockRunPartialWorkflow2,
				processRunExecutionData: jest.fn(),
			}));
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				pinData,
			);
			expect(mockRunPartialWorkflow2).toHaveBeenCalled();
			expect(mockRunPartialWorkflow2.mock.calls[0][0]).toBe(workflow);
			expect(mockRunPartialWorkflow2.mock.calls[0][4]).toBe(destinationNodeName);
		});
		it('should validate nodes exist before execution', async () => {
			const startNodeName = 'existingNode';
			const data = (0, jest_mock_extended_1.mock)({
				triggerToStartFrom: {
					name: 'triggerNode',
					data: (0, jest_mock_extended_1.mock)(),
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === startNodeName)
						return (0, jest_mock_extended_1.mock)({ name: startNodeName });
					return null;
				}),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			await manualExecutionService.runManually(data, workflow, additionalData, executionId);
			expect(workflow.getNode).toHaveBeenCalledWith(startNodeName);
		});
		it('should handle pinData correctly when provided', async () => {
			const startNodeName = 'startNode';
			const triggerNodeName = 'triggerNode';
			const mockTriggerData = (0, jest_mock_extended_1.mock)();
			const mockPinData = {
				[startNodeName]: [{ json: { pinned: true } }],
			};
			const data = (0, jest_mock_extended_1.mock)({
				triggerToStartFrom: {
					name: triggerNodeName,
					data: mockTriggerData,
				},
				startNodes: [{ name: startNodeName }],
				executionMode: 'manual',
			});
			const startNode = (0, jest_mock_extended_1.mock)({ name: startNodeName });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === startNodeName) return startNode;
					return null;
				}),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-execution-id';
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				mockPinData,
			);
			expect(n8n_core_1.WorkflowExecute).toHaveBeenCalledWith(
				additionalData,
				data.executionMode,
				expect.objectContaining({
					resultData: expect.objectContaining({
						pinData: mockPinData,
					}),
				}),
			);
		});
		it('should call runPartialWorkflow2 for V2 partial execution with runData and empty startNodes', async () => {
			const mockRunData = { nodeA: [{ data: { main: [[{ json: { value: 'test' } }]] } }] };
			const destinationNodeName = 'nodeB';
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [],
				partialExecutionVersion: 2,
				destinationNode: destinationNodeName,
				pinData: {},
				dirtyNodeNames: [],
				agentRequest: undefined,
			});
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => (0, jest_mock_extended_1.mock)({ name })),
			});
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-exec-id-v2-empty-start';
			const mockRunPartialWorkflow2 = jest.fn().mockReturnValue('mockPartial2Return-v2-empty');
			core.WorkflowExecute.mockImplementationOnce(() => ({
				runPartialWorkflow2: mockRunPartialWorkflow2,
				processRunExecutionData: jest.fn(),
				run: jest.fn(),
				runPartialWorkflow: jest.fn(),
			}));
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				data.pinData,
			);
			expect(mockRunPartialWorkflow2).toHaveBeenCalledWith(
				workflow,
				mockRunData,
				data.pinData,
				data.dirtyNodeNames,
				destinationNodeName,
				data.agentRequest,
			);
		});
		it('should call workflowExecute.run for V1 partial execution with runData and empty startNodes', async () => {
			const mockRunData = { nodeA: [{ data: { main: [[{ json: { value: 'test' } }]] } }] };
			const data = (0, jest_mock_extended_1.mock)({
				executionMode: 'manual',
				runData: mockRunData,
				startNodes: [],
				destinationNode: 'nodeC',
				pinData: { nodeX: [{ json: {} }] },
				triggerToStartFrom: undefined,
			});
			const determinedStartNode = (0, jest_mock_extended_1.mock)({ name: 'manualTrigger' });
			const destinationNodeMock = (0, jest_mock_extended_1.mock)({ name: data.destinationNode });
			const workflow = (0, jest_mock_extended_1.mock)({
				getNode: jest.fn((name) => {
					if (name === data.destinationNode) {
						return destinationNodeMock;
					}
					if (name === determinedStartNode.name) {
						return determinedStartNode;
					}
					return null;
				}),
				getTriggerNodes: jest.fn().mockReturnValue([determinedStartNode]),
				nodeTypes: {
					getByNameAndVersion: jest
						.fn()
						.mockReturnValue({ description: { name: '', outputs: [] } }),
				},
			});
			jest
				.spyOn(manualExecutionService, 'getExecutionStartNode')
				.mockReturnValue(determinedStartNode);
			const additionalData = (0, jest_mock_extended_1.mock)();
			const executionId = 'test-exec-id-v1-empty-start';
			const mockRun = jest.fn().mockReturnValue('mockRunReturn-v1-empty');
			core.WorkflowExecute.mockImplementationOnce(() => ({
				run: mockRun,
				processRunExecutionData: jest.fn(),
				runPartialWorkflow: jest.fn(),
				runPartialWorkflow2: jest.fn(),
			}));
			await manualExecutionService.runManually(
				data,
				workflow,
				additionalData,
				executionId,
				data.pinData,
			);
			expect(manualExecutionService.getExecutionStartNode).toHaveBeenCalledWith(data, workflow);
			expect(mockRun).toHaveBeenCalledWith(
				workflow,
				determinedStartNode,
				data.destinationNode,
				data.pinData,
				data.triggerToStartFrom,
			);
		});
	});
	it('should call workflowExecute.run for full execution when execution mode is evaluation', async () => {
		const data = (0, jest_mock_extended_1.mock)({
			executionMode: 'evaluation',
			destinationNode: undefined,
			pinData: {},
			runData: {},
			triggerToStartFrom: undefined,
		});
		const workflow = (0, jest_mock_extended_1.mock)({
			getNode: jest.fn().mockReturnValue(null),
			getTriggerNodes: jest.fn().mockReturnValue([]),
		});
		const additionalData = (0, jest_mock_extended_1.mock)();
		const executionId = 'test-execution-id-evaluation';
		const mockRun = jest.fn().mockReturnValue('mockRunReturnEvaluation');
		require('n8n-core').WorkflowExecute.mockImplementationOnce(() => ({
			run: mockRun,
			processRunExecutionData: jest.fn(),
		}));
		await manualExecutionService.runManually(data, workflow, additionalData, executionId);
		expect(mockRun.mock.calls[0][0]).toBe(workflow);
		expect(mockRun.mock.calls[0][1]).toBeUndefined();
		expect(mockRun.mock.calls[0][2]).toBeUndefined();
		expect(mockRun.mock.calls[0][3]).toBe(data.pinData);
		expect(mockRun.mock.calls[0][4]).toBeUndefined();
	});
});
//# sourceMappingURL=manual-execution.service.test.js.map
