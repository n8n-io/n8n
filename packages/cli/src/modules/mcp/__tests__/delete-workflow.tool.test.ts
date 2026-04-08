import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { createArchiveWorkflowTool } from '../tools/workflow-builder/delete-workflow.tool';

import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';

jest.mock('@n8n/ai-workflow-builder', () => ({
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive Workflow' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow_code', displayTitle: 'Validate' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: {
		toolName: 'create_workflow_from_code',
		displayTitle: 'Create',
	},
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
}));

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('archive-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowService: WorkflowService;
	let telemetry: Telemetry;

	beforeEach(() => {
		jest.clearAllMocks();

		workflowService = mockInstance(WorkflowService);
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
	});

	const createTool = () => createArchiveWorkflowTool(user, workflowService, telemetry);

	describe('smoke tests', () => {
		test('creates tool with correct name and destructiveHint=true', () => {
			const tool = createTool();

			expect(tool.name).toBe('archive_workflow');
			expect(tool.config).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					destructiveHint: true,
					readOnlyHint: false,
					idempotentHint: true,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('successfully archives workflow and returns expected response', async () => {
			(workflowService.archive as jest.Mock).mockResolvedValue({
				id: 'wf-1',
				name: 'My Workflow',
			});

			const tool = createTool();
			const result = await tool.handler({ workflowId: 'wf-1' }, {} as never);

			const response = parseResult(result);
			expect(response.archived).toBe(true);
			expect(response.workflowId).toBe('wf-1');
			expect(response.name).toBe('My Workflow');
			expect(result.isError).toBeUndefined();
		});

		test('returns error when workflow not found or no permission to archive', async () => {
			(workflowService.archive as jest.Mock).mockResolvedValue(null);

			const tool = createTool();
			const result = await tool.handler({ workflowId: 'wf-missing' }, {} as never);

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toContain('not found or');
			expect(response.error).toContain('permission to archive');
		});

		test('returns error when service throws', async () => {
			(workflowService.archive as jest.Mock).mockRejectedValue(
				new Error('Database connection lost'),
			);

			const tool = createTool();
			const result = await tool.handler({ workflowId: 'wf-1' }, {} as never);

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.error).toBe('Database connection lost');
		});

		test('tracks telemetry on success', async () => {
			(workflowService.archive as jest.Mock).mockResolvedValue({
				id: 'wf-1',
				name: 'My Workflow',
			});

			const tool = createTool();
			await tool.handler({ workflowId: 'wf-1' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'archive_workflow',
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({ workflowId: 'wf-1' }),
					}),
				}),
			);
		});

		test('tracks telemetry on failure', async () => {
			(workflowService.archive as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

			const tool = createTool();
			await tool.handler({ workflowId: 'wf-1' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'archive_workflow',
					results: expect.objectContaining({
						success: false,
						error: 'Unexpected error',
					}),
				}),
			);
		});
	});
});
