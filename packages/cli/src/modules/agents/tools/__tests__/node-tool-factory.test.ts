import { Container } from '@n8n/di';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';

import { resolveNodeTool } from '../node-tool-factory';

// The node-tool-factory imports the DI `Container` to look up NodeTypes inside
// `resolveInputSchema` (for auto-seeding a `{ input: string }` schema on
// native tools). In the unit-test scope the container isn't registered and
// `Container.get(NodeTypes)` throws — the function's own `try/catch` swallows
// that and falls back to an empty schema. The test doesn't need a real executor
// either; the handler isn't invoked.
const mockCtx = {
	executor: {} as unknown as EphemeralNodeExecutor,
	projectId: 'p1',
};

const baseToolSchema = {
	type: 'node' as const,
	name: 'Google Drive',
	node: {
		nodeType: 'n8n-nodes-base.googleDriveTool',
		nodeTypeVersion: 1,
		nodeParameters: {},
	},
};

afterEach(() => {
	Container.reset();
});

describe('resolveNodeTool → tool name sanitization', () => {
	it('replaces whitespace with underscores so Anthropic accepts the identifier', async () => {
		// Anthropic rejects names that don't match ^[a-zA-Z0-9_-]{1,128}$.
		// "Google Drive" must become "Google_Drive" before the Tool builder sees it.
		const tool = await resolveNodeTool(baseToolSchema, mockCtx);
		expect(tool.name).toBe('Google_Drive');
	});

	it('leaves already-valid names untouched', async () => {
		const tool = await resolveNodeTool({ ...baseToolSchema, name: 'slack_search' }, mockCtx);
		expect(tool.name).toBe('slack_search');
	});

	it('collapses non-alphanumerics and handles edge characters', async () => {
		const tool = await resolveNodeTool({ ...baseToolSchema, name: 'Foo / Bar:  (v2)' }, mockCtx);
		// `nodeNameToToolName` collapses any run of disallowed characters into a single `_`.
		expect(tool.name).toBe('Foo_Bar_v2_');
	});

	it('executes the mirrored tool node when config stores the base node type', async () => {
		const executeInline = jest.fn().mockResolvedValue({ status: 'success', data: [] });
		const getByNameAndVersion = jest.fn().mockReturnValue({
			description: { description: 'HTTP Request Tool' },
		});
		Container.set(NodeTypes, { getByNameAndVersion } as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: {
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4,
					nodeParameters: {},
				},
			},
			{
				executor: { executeInline } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		await tool.handler!({ url: 'https://example.com' }, {} as never);

		expect(getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.httpRequestTool', 4);
		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({ nodeType: 'n8n-nodes-base.httpRequestTool' }),
		);
	});

	it('derives inputSchema from $fromAI node parameters', async () => {
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: {
					...baseToolSchema.node,
					nodeParameters: {
						url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
					},
				},
			},
			mockCtx,
		);

		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		expect(typeof schema.safeParse).toBe('function');
		expect(schema.safeParse({ url: 'https://example.com' }).success).toBe(true);
		expect(schema.safeParse({}).success).toBe(false);
	});

	it('passes node parameters through unchanged at execution time', async () => {
		const executeInline = jest.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				description: 'Make an HTTP request to any URL',
				node: {
					...baseToolSchema.node,
					nodeParameters: { method: 'GET', toolDescription: 'Stale generated description' },
				},
			},
			{
				executor: { executeInline } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		await tool.handler!({ url: 'https://example.com' }, {} as never);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeParameters: {
					method: 'GET',
					toolDescription: 'Stale generated description',
				},
			}),
		);
	});

	it('uses the introspected supplyData schema directly', async () => {
		const inputSchema = z.object({ query: z.string() });
		const introspectSupplyDataToolSchema = jest.fn().mockResolvedValue(inputSchema);
		Container.set(NodeTypes, {
			getByNameAndVersion: jest.fn().mockReturnValue({
				description: { description: 'Search Wikipedia' },
				supplyData: jest.fn(),
			}),
		} as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: {
					nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		expect(tool.inputSchema).toBe(inputSchema);
		expect(introspectSupplyDataToolSchema).toHaveBeenCalled();
	});
});
