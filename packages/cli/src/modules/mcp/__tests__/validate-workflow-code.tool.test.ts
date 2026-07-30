import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { NodeConnectionTypes } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';

import {
	createValidateWorkflowCodeTool,
	type ValidateWorkflowCodeToolOptions,
} from '../tools/workflow-builder/validate-workflow-code.tool';

// Mocks referenced inside vi.mock factories must come from vi.hoisted.
const { mockParseAndValidate, mockStripImportStatements } = vi.hoisted(() => ({
	mockParseAndValidate: vi.fn(),
	mockStripImportStatements: vi.fn((code: string) => code),
}));

vi.mock('@n8n/ai-workflow-builder', () => ({
	// `new ParseValidateHandler()` — use a constructable function, not an arrow.
	ParseValidateHandler: vi.fn(function () {
		return { parseAndValidate: mockParseAndValidate };
	}),
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
	let nodeTypes: ReturnType<typeof mockInstance<NodeTypes>>;

	beforeEach(() => {
		vi.clearAllMocks();

		telemetry = mockInstance(Telemetry, {
			track: vi.fn(),
		});
		nodeTypes = mockInstance(NodeTypes);
		nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
			if (type === '@n8n/n8n-nodes-langchain.agent') {
				return { description: { outputs: [NodeConnectionTypes.Main] } };
			}
			if (type === '@n8n/n8n-nodes-langchain.agentTool') {
				return { description: { outputs: [NodeConnectionTypes.AiTool] } };
			}
			return { description: { outputs: [NodeConnectionTypes.Main] } };
		}) as typeof nodeTypes.getByNameAndVersion);
	});

	const createTool = (options?: ValidateWorkflowCodeToolOptions) =>
		createValidateWorkflowCodeTool(user, telemetry, nodeTypes, options);

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

		test('includes SDK reference hint only for parse errors', async () => {
			const parseError = new Error('Failed to parse generated workflow code: unexpected token');
			parseError.name = 'WorkflowCodeParseError';
			mockParseAndValidate.mockRejectedValue(parseError);

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(response.hint).toContain('sdk_ref');
			expect(response.hint).toContain('Workflow SDK reference');
			expect(response.hint).toContain('validate_workflow_code');
		});

		test('does not include SDK reference hint for non-parse errors', async () => {
			mockParseAndValidate.mockRejectedValue(new Error('Some other error'));

			const tool = createTool();
			const result = await tool.handler({ code: 'bad code' }, {} as never);

			const response = parseResult(result);
			expect(response.hint).toBeUndefined();
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

		test('returns valid=false when an agent is wired as a tool to another agent', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: {
					nodes: [
						{
							id: 'manager',
							name: 'Manager Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'worker',
							name: 'Worker Agent',
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 3,
							position: [200, 0],
							parameters: {},
						},
					],
					connections: {
						'Worker Agent': {
							ai_tool: [[{ node: 'Manager Agent', type: 'ai_tool', index: 0 }]],
						},
					},
				},
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(Array.isArray(response.errors)).toBe(true);
			expect((response.errors as string[])[0]).toContain('@n8n/n8n-nodes-langchain.agentTool');
			expect(result.isError).toBe(true);
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

	describe('canvas groups (102_mcp_canvas_groups)', () => {
		const makeGroupedWorkflow = (
			nodeGroups: Array<{ id: string; name: string; nodeIds: string[] }>,
		) => ({
			name: 'wf',
			nodes: [
				{
					id: 'trigger',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'a',
					name: 'A',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'b',
					name: 'B',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				Trigger: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
			},
			nodeGroups,
		});

		/** results of the last tracked telemetry event */
		const trackedResults = () => {
			const payload = vi.mocked(telemetry.track).mock.calls.at(-1)?.[1] as {
				results?: { success?: boolean; error?: string; data?: Record<string, unknown> };
			};
			return payload.results;
		};

		/** results.data of the last tracked telemetry event */
		const trackedData = () => trackedResults()?.data;

		beforeEach(() => {
			// The group validator resolves trigger-ness via description.group.
			nodeTypes.getByNameAndVersion.mockImplementation(((type: string) => {
				if (type === 'n8n-nodes-base.manualTrigger') {
					return { description: { group: ['trigger'], outputs: [NodeConnectionTypes.Main] } };
				}
				return { description: { group: ['transform'], outputs: [NodeConnectionTypes.Main] } };
			}) as typeof nodeTypes.getByNameAndVersion);
		});

		test('flag off: groups are not validated and output/telemetry are unchanged', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: makeGroupedWorkflow([{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a'] }]),
				warnings: [],
			});

			const tool = createTool();
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
			// Telemetry payload is byte-identical to the pre-flag shape.
			expect(trackedData()).toEqual({ nodeCount: 3, warningCount: 0 });
		});

		test('flag on: a valid group produces no errors and is counted in telemetry', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: makeGroupedWorkflow([{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }]),
				warnings: [],
			});

			const tool = createTool({ canvasGroupsEnabled: true });
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
			expect(trackedData()).toEqual({
				nodeCount: 3,
				warningCount: 0,
				groupCount: 1,
			});
		});

		test('flag on: group violations fail validation with the save-path message', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: makeGroupedWorkflow([{ id: 'g1', name: 'Group', nodeIds: ['trigger', 'a'] }]),
				warnings: [],
			});

			const tool = createTool({ canvasGroupsEnabled: true });
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response).toEqual({
				valid: false,
				errors: ['Node group "Group" (g1) cannot contain trigger nodes: Trigger.'],
			});
			expect(trackedResults()).toEqual({
				success: false,
				error: 'Node group "Group" (g1) cannot contain trigger nodes: Trigger.',
				data: {
					groupCount: 1,
					groupViolationCount: 1,
					groupViolationCodes: ['trigger-selected'],
				},
			});
		});

		test('flag on: all group violations are reported as errors, one entry each', async () => {
			const sdkWarning = { code: 'deprecated', message: 'Node X is deprecated' };
			mockParseAndValidate.mockResolvedValue({
				workflow: makeGroupedWorkflow([
					{ id: 'g1', name: 'Group', nodeIds: ['a', 'missing'] },
					{ id: 'g2', name: 'Group', nodeIds: ['b'] },
				]),
				warnings: [sdkWarning],
			});

			const tool = createTool({ canvasGroupsEnabled: true });
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(result.isError).toBe(true);
			expect(response.valid).toBe(false);
			expect(response.errors).toEqual([
				'Group "Group" references node ID "missing" that does not exist in the workflow.',
				'Duplicate node group name "Group".',
			]);
			// Error responses carry only errors, matching the other invalid paths.
			expect(response).not.toHaveProperty('warnings');
			expect(trackedResults()).toEqual({
				success: false,
				error:
					'Group "Group" references node ID "missing" that does not exist in the workflow. ' +
					'Duplicate node group name "Group".',
				data: {
					groupCount: 2,
					groupViolationCount: 2,
					groupViolationCodes: ['unknown-node-id', 'duplicate-group-name'],
				},
			});
		});

		test('flag on: connections under unsafe object keys are skipped, not assigned', async () => {
			// Built via JSON.parse: an object literal with a "__proto__" key would
			// invoke the prototype setter instead of creating an own property.
			// Both entries would be boundary-crossing ai_languageModel connections
			// into the group if their keys were honored; skipping them is the
			// deliberate trade-off for never writing object-internal keys.
			const hostileConnections = JSON.parse(
				'{"__proto__": {"ai_languageModel": [[{"node": "A", "type": "ai_languageModel", "index": 0}]]},' +
					' "constructor": {"ai_languageModel": [[{"node": "B", "type": "ai_languageModel", "index": 0}]]}}',
			) as Record<string, unknown>;
			const workflow = makeGroupedWorkflow([{ id: 'g1', name: 'Group', nodeIds: ['a', 'b'] }]);
			mockParseAndValidate.mockResolvedValue({
				workflow: {
					...workflow,
					connections: { ...workflow.connections, ...hostileConnections },
				},
				warnings: [],
			});

			const tool = createTool({ canvasGroupsEnabled: true });
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(result.isError).toBeUndefined();
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
			expect(trackedData()).toEqual({
				nodeCount: 3,
				warningCount: 0,
				groupCount: 1,
			});
		});

		test('flag on: workflows without groups report groupCount 0', async () => {
			mockParseAndValidate.mockResolvedValue({
				workflow: makeGroupedWorkflow([]),
				warnings: [],
			});

			const tool = createTool({ canvasGroupsEnabled: true });
			const result = await tool.handler({ code: 'const wf = ...' }, {} as never);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response).not.toHaveProperty('warnings');
			expect(trackedData()).toEqual({
				nodeCount: 3,
				warningCount: 0,
				groupCount: 0,
			});
		});
	});
});
