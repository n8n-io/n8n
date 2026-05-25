import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { createValidateNodeTool } from '../tools/workflow-builder/validate-node.tool';

import { Telemetry } from '@/telemetry';

const mockValidateNodeConfig = jest.fn();

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: (...args: unknown[]) => mockValidateNodeConfig(...args),
}));

jest.mock('@n8n/ai-workflow-builder', () => ({
	CODE_BUILDER_VALIDATE_NODE_TOOL: {
		toolName: 'validate_node',
		displayTitle: 'Validating node',
	},
}));

/** Parse the first text content item from a tool result */
const parseResult = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse((result.content[0] as { type: 'text'; text: string }).text) as Record<string, unknown>;

describe('validate-node MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Telemetry;

	beforeEach(() => {
		jest.clearAllMocks();
		telemetry = mockInstance(Telemetry, { track: jest.fn() });
	});

	const createTool = () => createValidateNodeTool(user, telemetry);

	describe('smoke tests', () => {
		test('creates tool with correct name and read-only annotations', () => {
			const tool = createTool();

			expect(tool.name).toBe('validate_node');
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
		test('returns valid=true for a single valid node', async () => {
			mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });

			const tool = createTool();
			const result = await tool.handler(
				{
					nodes: [
						{
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							parameters: { mode: 'manual', assignments: { assignments: [] } },
						},
					],
				},
				{} as never,
			);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect(response.results).toEqual([
				{
					index: 0,
					type: 'n8n-nodes-base.set',
					valid: true,
				},
			]);
			expect(result.isError).toBeUndefined();
		});

		test('returns structured errors for invalid node', async () => {
			mockValidateNodeConfig.mockReturnValue({
				valid: false,
				errors: [{ path: 'mode', message: 'Invalid value: expected "manual" or "raw"' }],
			});

			const tool = createTool();
			const result = await tool.handler(
				{
					nodes: [
						{
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							parameters: { mode: 'bogus' },
						},
					],
				},
				{} as never,
			);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			expect(response.results).toEqual([
				{
					index: 0,
					type: 'n8n-nodes-base.set',
					valid: false,
					errors: [{ path: 'mode', message: 'Invalid value: expected "manual" or "raw"' }],
				},
			]);
		});

		test('mixes valid and invalid nodes — top-level valid is false', async () => {
			mockValidateNodeConfig.mockReturnValueOnce({ valid: true, errors: [] }).mockReturnValueOnce({
				valid: false,
				errors: [{ path: 'url', message: 'URL is required' }],
			});

			const tool = createTool();
			const result = await tool.handler(
				{
					nodes: [
						{ name: 'Set', type: 'n8n-nodes-base.set', typeVersion: 3, parameters: {} },
						{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, parameters: {} },
					],
				},
				{} as never,
			);

			const response = parseResult(result);
			expect(response.valid).toBe(false);
			const results = response.results as Array<Record<string, unknown>>;
			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				index: 0,
				name: 'Set',
				type: 'n8n-nodes-base.set',
				valid: true,
			});
			expect(results[1]).toEqual({
				index: 1,
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				valid: false,
				errors: [{ path: 'url', message: 'URL is required' }],
			});
		});

		test('forwards typeVersion and parameters as received from Zod-parsed input', async () => {
			// At runtime the MCP framework Zod-parses input before calling the handler,
			// so `.default(1)` for typeVersion and `.default({})` for parameters are
			// already applied. This test verifies the handler forwards them unchanged.
			mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });

			const tool = createTool();
			await tool.handler(
				{
					nodes: [{ type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} }],
				},
				{} as never,
			);

			expect(mockValidateNodeConfig).toHaveBeenCalledWith(
				'n8n-nodes-base.noOp',
				1,
				{ parameters: {}, subnodes: undefined },
				{ isToolNode: undefined },
			);
		});

		test('forwards isToolNode to validateNodeConfig options', async () => {
			mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });

			const tool = createTool();
			await tool.handler(
				{
					nodes: [
						{
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4,
							parameters: { url: 'https://example.com' },
							isToolNode: true,
						},
					],
				},
				{} as never,
			);

			expect(mockValidateNodeConfig).toHaveBeenCalledWith(
				'n8n-nodes-base.httpRequest',
				4,
				{ parameters: { url: 'https://example.com' }, subnodes: undefined },
				{ isToolNode: true },
			);
		});

		test('forwards subnodes inside the config object', async () => {
			mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });
			const subnodes = {
				model: { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1 },
			};

			const tool = createTool();
			await tool.handler(
				{
					nodes: [
						{
							type: '@n8n/n8n-nodes-langchain.agent',
							typeVersion: 1,
							parameters: { agent: 'conversationalAgent' },
							subnodes,
						},
					],
				},
				{} as never,
			);

			expect(mockValidateNodeConfig).toHaveBeenCalledWith(
				'@n8n/n8n-nodes-langchain.agent',
				1,
				{ parameters: { agent: 'conversationalAgent' }, subnodes },
				{ isToolNode: undefined },
			);
		});

		test('passes through graceful-fallback result for unknown node types', async () => {
			// validateNodeConfig returns valid:true when no schema is registered
			mockValidateNodeConfig.mockReturnValue({ valid: true, errors: [] });

			const tool = createTool();
			const result = await tool.handler(
				{
					nodes: [
						{ type: 'community-node-without-schema', typeVersion: 1, parameters: { foo: 'bar' } },
					],
				},
				{} as never,
			);

			const response = parseResult(result);
			expect(response.valid).toBe(true);
			expect((response.results as Array<{ valid: boolean }>)[0].valid).toBe(true);
		});

		test('tracks telemetry on success with nodeCount, invalidCount, and errorCount', async () => {
			mockValidateNodeConfig.mockReturnValueOnce({ valid: true, errors: [] }).mockReturnValueOnce({
				valid: false,
				errors: [
					{ path: 'a', message: 'bad a' },
					{ path: 'b', message: 'bad b' },
				],
			});

			const tool = createTool();
			await tool.handler(
				{
					nodes: [
						{ type: 'n8n-nodes-base.set', typeVersion: 3, parameters: {} },
						{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4, parameters: {} },
					],
				},
				{} as never,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'validate_node',
					parameters: expect.objectContaining({ nodeCount: 2 }),
					results: expect.objectContaining({
						success: true,
						data: expect.objectContaining({ invalidCount: 1, errorCount: 2 }),
					}),
				}),
			);
		});

		test('tracks telemetry on failure when validateNodeConfig throws', async () => {
			mockValidateNodeConfig.mockImplementation(() => {
				throw new Error('schema load failed');
			});

			const tool = createTool();
			const result = await tool.handler(
				{
					nodes: [{ type: 'n8n-nodes-base.set', typeVersion: 3, parameters: {} }],
				},
				{} as never,
			);

			expect(result.isError).toBe(true);
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'validate_node',
					results: expect.objectContaining({
						success: false,
						error: 'schema load failed',
					}),
				}),
			);
		});
	});
});
