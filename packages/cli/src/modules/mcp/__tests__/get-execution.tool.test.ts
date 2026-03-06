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
			expect(tool.config.description).toContain('Get full execution details');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('execution retrieval', () => {
			test('throws error when execution does not exist', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(null);
				(executionRepository.existsBy as jest.Mock).mockResolvedValue(false);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'missing-execution',
					},
					{} as never,
				);

				expect(executionRepository.findWithUnflattenedData).toHaveBeenCalledWith(
					'missing-execution',
					['workflow-1'],
				);
				expect(result.structuredContent).toMatchObject({
					execution: null,
					error: "Execution with ID 'missing-execution' does not exist",
				});
			});

			test('throws error when execution does not belong to workflow', async () => {
				const tool = createGetExecutionTool(
					user,
					executionRepository,
					workflowFinderService,
					telemetry,
				);

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(null);
				(executionRepository.existsBy as jest.Mock).mockResolvedValue(true);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-1',
					},
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({
					execution: null,
					error: "Execution 'execution-1' does not belong to workflow 'workflow-1'",
				});
			});

			test('successfully retrieves execution data', async () => {
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
						parameters: { workflowId: 'workflow-1', executionId: 'execution-1' },
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
					data: createEmptyRunExecutionData(),
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-2',
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
					data: createEmptyRunExecutionData(),
				};

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(mockWorkflow);
				(executionRepository.findWithUnflattenedData as jest.Mock).mockResolvedValue(mockExecution);

				const result = await tool.handler(
					{
						workflowId: 'workflow-1',
						executionId: 'execution-3',
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
