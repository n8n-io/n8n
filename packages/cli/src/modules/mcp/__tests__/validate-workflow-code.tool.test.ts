import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { createValidateWorkflowCodeTool } from '../tools/workflow-builder/validate-workflow-code.tool';

import { Telemetry } from '@/telemetry';

const mockParseAndValidate = jest.fn();
const mockStripImportStatements = jest.fn((code: string) => code);

jest.mock('@n8n/ai-workflow-builder', () => ({
	ParseValidateHandler: jest.fn().mockImplementation(() => ({
		parseAndValidate: mockParseAndValidate,
	})),
	stripImportStatements: (code: string) => mockStripImportStatements(code),
	CODE_BUILDER_VALIDATE_TOOL: {
		toolName: 'validate_workflow_code',
		displayTitle: 'Validate Workflow Code',
	},
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: {
		toolName: 'create_workflow_from_code',
		displayTitle: 'Create',
	},
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive' },
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
}));

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('validate-workflow-code MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Telemetry;

	beforeEach(() => {
		jest.clearAllMocks();

		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
	});

	const createTool = () => createValidateWorkflowCodeTool(user, telemetry);

	describe('smoke tests', () => {
		test('creates tool with correct name and readOnlyHint=true', () => {
			const tool = createTool();

			expect(tool.name).toBe('validate_workflow_code');
			expect(tool.config).toBeDefined();
			expect(tool.config.annotations).toEqual(
				expect.objectContaining({
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				}),
			);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('returns valid=true with nodeCount for valid code', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }, { id: '2' }, { id: '3' }] },
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response.nodeCount).toBe(3);
			expect(result.isError).toBeUndefined();
		});

		test('includes warnings array when warnings exist', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }] },
				warnings: [
					{ code: 'deprecated', message: 'Node X is deprecated', nodeName: 'HTTP Request' },
					{
						code: 'no-target',
						message: 'Connection Y has no target',
						parameterPath: 'options.retry',
					},
				],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const expectedWarnings = [
				{
					code: 'deprecated',
					message: 'Node X is deprecated',
					nodeName: 'HTTP Request',
				},
				{
					code: 'no-target',
					message: 'Connection Y has no target',
					parameterPath: 'options.retry',
				},
			];

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response.warnings).toEqual(expectedWarnings);
			expect(result.structuredContent).toEqual(
				expect.objectContaining({ warnings: expectedWarnings }),
			);
		});

		test('omits warnings key when no warnings', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }] },
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
		});

		test('returns valid=false with errors for invalid code', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Syntax error at line 10'));

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(response.errors).toEqual(['Syntax error at line 10']);
			expect(result.isError).toBe(true);
		});

		test('tracks telemetry on success with nodeCount and warningCount', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: { nodes: [{ id: '1' }, { id: '2' }] },
				warnings: [{ code: 'warn', message: 'some warning' }],
			});

			const tool = createTool();
			await tool.handler({ code: 'const wf = ...' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'validate_workflow_code',
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({
							nodeCount: 2,
							warningCount: 1,
						}),
					}),
				}),
			);
		});

		test('tracks telemetry on failure with error message', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Parse failed'));

			const tool = createTool();
			await tool.handler({ code: 'bad code' }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'validate_workflow_code',
					results: expect.objectContaining({
						success: false,
						error: 'Parse failed',
					}),
				}),
			);
		});
	});
});
