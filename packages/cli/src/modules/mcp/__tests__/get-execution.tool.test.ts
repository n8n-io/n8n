import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionRepository, User } from '@n8n/db';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createGetExecutionTool } from '../tools/get-execution.tool';

describe('get-execution MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let executionRepository: ExecutionRepository;
	let workflowFinderService: WorkflowFinderService;
	let telemetry: Telemetry;

	const mockWorkflow = {
		id: 'workflow-1',
		name: 'Test Workflow',
		isArchived: false,
		settings: { availableInMCP: true },
	};

	beforeEach(() => {
		executionRepository = mockInstance(ExecutionRepository);
		workflowFinderService = mockInstance(WorkflowFinderService);
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
	});

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const tool = createGetExecutionTool(
				user,
				executionRepository,
				workflowFinderService,
				telemetry,
			);

			expect(tool.name).toBe('get_execution');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toContain('Get execution details');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('execution retrieval', () => {
			test('returns generic error when execution is not found for workflow', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findIfAccessible as jest.Mock).mockResolvedValue(null);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'missing-execution',
						includeData: undefined,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(executionRepository.findIfAccessible).toHaveBeenCalledWith('missing-execution', [
					'workflow-1',
				]);
				// Must not leak whether the execution exists in another workflow
				expect(result.structuredContent).toMatchObject({
					execution: null,
					error: "Execution 'missing-execution' not found for workflow 'workflow-1'",
				});
			});

			test('returns metadata only by default (no includeData)', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findIfAccessible as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: undefined,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: {
						id: 'execution-1',
						workflowId: 'workflow-1',
						mode: 'manual',
						status: 'success',
					},
				});
				expect(result.structuredContent).not.toHaveProperty('data');
			});

			test('successfully retrieves execution data with includeData: true', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: {
						id: 'execution-1',
						workflowId: 'workflow-1',
						mode: 'manual',
						status: 'success',
						startedAt: '2025-01-01T00:00:00.000Z',
						stoppedAt: '2025-01-01T00:01:00.000Z',
						retryOf: null,
						retrySuccessId: null,
						waitTill: null,
					},
					data: mockExecutionData,
				});

				expect(telemetry.track).toHaveBeenCalledWith(
					USER_CALLED_MCP_TOOL_EVENT,
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'get_execution',
						parameters: expect.objectContaining({
							workflowId: 'workflow-1',
							executionId: 'execution-1',
							includeData: true,
						}),
						results: {
							success: true,
							data: {
								executionId: 'execution-1',
								status: 'success',
							},
						},
					}),
				);
			});

			test('filters data by nodeNames', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [[{ json: { value: 'node1' } }]] },
						},
					],
					Node2: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 200,
							source: [],
							data: { main: [[{ json: { value: 'node2' } }]] },
						},
					],
					Node3: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 300,
							source: [],
							data: { main: [[{ json: { value: 'node3' } }]] },
						},
					],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: ['Node1'],
						truncateData: undefined,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, unknown> };
				};
				expect(Object.keys(data.resultData.runData)).toEqual(['Node1']);
			});

			test('truncates data items per node output', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				const manyItems = Array.from({ length: 10 }, (_, i) => ({ json: { index: i } }));
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [manyItems] },
						},
					],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: undefined,
						truncateData: 2,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, { data: { main: unknown[][] } }[]> };
				};
				expect(data.resultData.runData.Node1[0].data.main[0]).toHaveLength(2);
			});

			test('applies nodeNames and truncateData together', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				const manyItems = Array.from({ length: 5 }, (_, i) => ({ json: { index: i } }));
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [manyItems] },
						},
					],
					Node2: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 200,
							source: [],
							data: { main: [[{ json: { value: 'node2' } }]] },
						},
					],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: ['Node1'],
						truncateData: 2,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, { data: { main: unknown[][] } }[]> };
				};
				expect(Object.keys(data.resultData.runData)).toEqual(['Node1']);
				expect(data.resultData.runData.Node1[0].data.main[0]).toHaveLength(2);
			});

			test('nodeNames with non-existent node returns empty runData', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [[{ json: { value: 'node1' } }]] },
						},
					],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: ['NonExistentNode'],
						truncateData: undefined,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, unknown> };
				};
				expect(Object.keys(data.resultData.runData)).toEqual([]);
			});

			test('empty nodeNames array returns empty runData and pinData', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [[{ json: { value: 'node1' } }]] },
						},
					],
				};
				mockExecutionData.resultData.pinData = {
					Node1: [{ json: { pinned: true } }],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: [],
						truncateData: undefined,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, unknown>; pinData: Record<string, unknown> };
				};
				expect(Object.keys(data.resultData.runData)).toEqual([]);
				expect(Object.keys(data.resultData.pinData)).toEqual([]);
			});

			test('filters pinData by nodeNames', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [[{ json: { value: 'node1' } }]] },
						},
					],
					Node2: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 200,
							source: [],
							data: { main: [[{ json: { value: 'node2' } }]] },
						},
					],
				};
				mockExecutionData.resultData.pinData = {
					Node1: [{ json: { pinned: 'node1' } }],
					Node2: [{ json: { pinned: 'node2' } }],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: ['Node1'],
						truncateData: undefined,
					},
					{} as never,
				);

				const data = (result.structuredContent as Record<string, unknown>).data as {
					resultData: { runData: Record<string, unknown>; pinData: Record<string, unknown> };
				};
				expect(Object.keys(data.resultData.runData)).toEqual(['Node1']);
				expect(Object.keys(data.resultData.pinData)).toEqual(['Node1']);
			});

			test('handles null execution data with includeData: true', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'crashed',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: null,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: ['Node1'],
						truncateData: 2,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: { id: 'execution-1', status: 'crashed' },
					data: null,
				});
			});

			test('ignores nodeNames and truncateData when includeData is false', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findIfAccessible as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: false,
						nodeNames: ['Node1'],
						truncateData: 2,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: { id: 'execution-1' },
				});
				expect(result.structuredContent).not.toHaveProperty('data');
			});

			test('handles execution with retry information', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecution = {
					id: 'execution-2',
					workflowId: 'workflow-1',
					mode: 'retry',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: 'execution-1',
					retrySuccessId: 'execution-2',
					waitTill: null,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findIfAccessible as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-2',
						includeData: undefined,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: {
						id: 'execution-2',
						retryOf: 'execution-1',
						retrySuccessId: 'execution-2',
					},
				});
			});

			test('handles execution data with circular references', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const mockExecutionData = createEmptyRunExecutionData();
				// Create circular reference in node output data
				const circularObj: Record<string, string | Record<string, unknown>> = { value: 'test' };
				circularObj.self = circularObj;

				mockExecutionData.resultData.runData = {
					Node1: [
						{
							executionIndex: 0,
							startTime: 0,
							executionTime: 100,
							source: [],
							data: { main: [[{ json: circularObj }]] },
						},
					],
				};

				const mockExecution = {
					id: 'execution-1',
					workflowId: 'workflow-1',
					mode: 'manual',
					status: 'success',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: new Date('2025-01-01T00:01:00.000Z'),
					retryOf: null,
					retrySuccessId: null,
					waitTill: null,
					data: mockExecutionData,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
						includeData: true,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: {
						id: 'execution-1',
						status: 'success',
					},
				});
				// Should not return an error — circular refs must be handled gracefully
				expect(result.structuredContent).not.toHaveProperty('error');
			});

			test('handles execution with waitTill', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				const waitTillDate = new Date('2025-01-01T12:00:00.000Z');
				const mockExecution = {
					id: 'execution-3',
					workflowId: 'workflow-1',
					mode: 'webhook',
					status: 'waiting',
					startedAt: new Date('2025-01-01T00:00:00.000Z'),
					stoppedAt: null,
					retryOf: null,
					retrySuccessId: null,
					waitTill: waitTillDate,
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findIfAccessible as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-3',
						includeData: undefined,
						nodeNames: undefined,
						truncateData: undefined,
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: {
						id: 'execution-3',
						status: 'waiting',
						waitTill: '2025-01-01T12:00:00.000Z',
					},
				});
			});
		});
	});
});
