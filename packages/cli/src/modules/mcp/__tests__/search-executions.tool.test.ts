import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { ExecutionSummary } from 'n8n-workflow';

import { ExecutionService } from '@/executions/execution.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createSearchExecutionsTool } from '../tools/search-executions.tool';

const createExecution = (overrides: Partial<ExecutionSummary> = {}): ExecutionSummary =>
	({
		id: 'exec-1',
		workflowId: 'wf-1',
		status: 'success',
		mode: 'manual',
		startedAt: '2024-06-01T10:00:00.000Z',
		stoppedAt: '2024-06-01T10:01:00.000Z',
		waitTill: undefined,
		finished: true,
		createdAt: '2024-06-01T10:00:00.000Z',
		...overrides,
	}) as ExecutionSummary;

describe('search-executions MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let executionService: ExecutionService;
	let workflowFinderService: WorkflowFinderService;
	let telemetry: Telemetry;

	beforeEach(() => {
		executionService = mockInstance(ExecutionService, {
			findRangeWithCount: jest.fn().mockResolvedValue({
				results: [],
				count: 0,
				estimated: false,
			}),
			buildSharingOptions: jest.fn().mockResolvedValue({
				scopes: ['workflow:read'],
				projectRoles: ['project:editor'],
				workflowRoles: ['workflow:editor'],
			}),
		});
		workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowForUser: jest.fn().mockResolvedValue({
				id: 'wf-1',
				isArchived: false,
				settings: { availableInMCP: true },
			}),
		});
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
	});

	const createTool = () =>
		createSearchExecutionsTool(user, executionService, workflowFinderService, telemetry);

	test('creates tool with correct metadata', () => {
		const tool = createTool();

		expect(tool.name).toBe('search_executions');
		expect(tool.config.annotations?.readOnlyHint).toBe(true);
		expect(typeof tool.handler).toBe('function');
	});

	test('returns executions with correct format', async () => {
		const executions = [
			createExecution({ id: 'exec-1', workflowId: 'wf-1', status: 'success' }),
			createExecution({
				id: 'exec-2',
				workflowId: 'wf-1',
				status: 'error',
				// ExecutionSummary dates are typed incorrectly
				// @ts-expect-error toSummary() returns ISO strings, not Dates
				stoppedAt: '2024-06-01T10:02:00.000Z',
			}),
		];
		(executionService.findRangeWithCount as jest.Mock).mockResolvedValue({
			results: executions,
			count: 2,
			estimated: false,
		});

		const result = await createTool().handler({} as never, {} as never);

		expect(result.structuredContent).toEqual({
			data: [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					status: 'success',
					mode: 'manual',
					startedAt: '2024-06-01T10:00:00.000Z',
					stoppedAt: '2024-06-01T10:01:00.000Z',
					waitTill: null,
				},
				{
					id: 'exec-2',
					workflowId: 'wf-1',
					status: 'error',
					mode: 'manual',
					startedAt: '2024-06-01T10:00:00.000Z',
					stoppedAt: '2024-06-01T10:02:00.000Z',
					waitTill: null,
				},
			],
			count: 2,
			estimated: false,
		});
	});

	test('filters by workflowId and validates MCP access', async () => {
		await createTool().handler({ workflowId: 'wf-1' } as never, {} as never);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(
			'wf-1',
			user,
			['workflow:read'],
			{ includeActiveVersion: undefined },
		);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.workflowId).toBe('wf-1');
	});

	test('filters by status', async () => {
		await createTool().handler({ status: ['error', 'crashed'] } as never, {} as never);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.status).toEqual(['error', 'crashed']);
	});

	test('filters by time range', async () => {
		await createTool().handler(
			{
				startedAfter: '2024-06-01T00:00:00.000Z',
				startedBefore: '2024-06-07T23:59:59.999Z',
			} as never,
			{} as never,
		);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.startedAfter).toBe('2024-06-01T00:00:00.000Z');
		expect(query.startedBefore).toBe('2024-06-07T23:59:59.999Z');
	});

	test('respects limit parameter and clamps to max', async () => {
		await createTool().handler({ limit: 500 } as never, {} as never);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.range.limit).toBe(200);
	});

	test('uses default limit when not provided', async () => {
		await createTool().handler({} as never, {} as never);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.range.limit).toBe(200);
	});

	test('handles pagination with lastId', async () => {
		await createTool().handler({ lastId: 'exec-50' } as never, {} as never);

		const query = (executionService.findRangeWithCount as jest.Mock).mock.calls[0][0];
		expect(query.range.lastId).toBe('exec-50');
	});

	test('returns empty results with correct structure', async () => {
		const result = await createTool().handler({} as never, {} as never);

		expect(result.structuredContent).toEqual({
			data: [],
			count: 0,
			estimated: false,
		});
	});

	test('delegates sharing options to executionService.buildSharingOptions', async () => {
		await createTool().handler({} as never, {} as never);

		expect(executionService.buildSharingOptions).toHaveBeenCalledWith('workflow:read');
	});

	test('tracks telemetry on success', async () => {
		(executionService.findRangeWithCount as jest.Mock).mockResolvedValue({
			results: [createExecution()],
			count: 1,
			estimated: false,
		});

		await createTool().handler({ workflowId: 'wf-1' } as never, {} as never);

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'search_executions',
				results: { success: true, data: { count: 1, estimated: false } },
			}),
		);
	});

	test('tracks telemetry on failure and returns error response', async () => {
		(executionService.findRangeWithCount as jest.Mock).mockRejectedValue(
			new Error('DB connection lost'),
		);

		const result = await createTool().handler({} as never, {} as never);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			data: [],
			count: 0,
			estimated: false,
			error: 'DB connection lost',
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			'User called mcp tool',
			expect.objectContaining({
				tool_name: 'search_executions',
				results: { success: false, error: 'DB connection lost' },
			}),
		);
	});
});
