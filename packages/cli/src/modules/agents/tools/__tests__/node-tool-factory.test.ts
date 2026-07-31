import { Container } from '@n8n/di';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';

import { AgentExpressionContext } from '../../expression/agent-expression-context';
import { resolveNodeTool, resolveNodeToolInputSchemaForRun } from '../node-tool-factory';

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
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const getByNameAndVersion = vi.fn().mockReturnValue({
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
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
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
		const introspectSupplyDataToolSchema = vi.fn().mockResolvedValue(inputSchema);
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Search Wikipedia' },
				supplyData: vi.fn(),
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

	it('uses a string-compatible object schema when native string tool introspection returns null', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const introspectSupplyDataToolSchema = vi.fn().mockResolvedValue(null);
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Think about something' },
				supplyData: vi.fn(),
			}),
		} as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				description: 'Use this to think',
				node: {
					nodeType: '@n8n/n8n-nodes-langchain.toolThink',
					nodeTypeVersion: 1.1,
					nodeParameters: {},
				},
			},
			{
				executor: {
					executeInline,
					introspectSupplyDataToolSchema,
				} as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		const schema = tool.inputSchema as z.ZodType;
		const parsedString = schema.safeParse('thinking about this problem');
		const parsedObject = schema.safeParse({ input: 'thinking about this problem' });

		expect(parsedString).toEqual({
			success: true,
			data: { input: 'thinking about this problem' },
		});
		expect(parsedObject).toEqual({
			success: true,
			data: { input: 'thinking about this problem' },
		});

		if (!parsedString.success) throw new Error('Expected string input to parse');
		await tool.handler?.(parsedString.data, {} as never);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { input: 'thinking about this problem' } }],
			}),
		);
	});
});

describe('resolveNodeTool → eval instrumentation', () => {
	it('binds the sanitized tool name into the ephemeral execution when instrumented', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const instrumentToolAdditionalData = vi.fn();

		const tool = await resolveNodeTool(baseToolSchema, {
			executor: { executeInline } as unknown as EphemeralNodeExecutor,
			projectId: 'p1',
			instrumentToolAdditionalData,
		});
		await tool.handler!({}, {} as never);

		const request = executeInline.mock.calls[0][0] as {
			nodeName?: string;
			configureAdditionalData?: (additionalData: object) => void;
		};
		expect(request.nodeName).toBe('Google_Drive');
		expect(request.configureAdditionalData).toBeDefined();

		const additionalData = {};
		request.configureAdditionalData!(additionalData);
		expect(instrumentToolAdditionalData).toHaveBeenCalledWith(additionalData, {
			toolName: 'Google_Drive',
			toolKind: 'node',
		});
	});

	it('passes neither override when not instrumented', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });

		const tool = await resolveNodeTool(baseToolSchema, {
			executor: { executeInline } as unknown as EphemeralNodeExecutor,
			projectId: 'p1',
		});
		await tool.handler!({}, {} as never);

		const request = executeInline.mock.calls[0][0] as Record<string, unknown>;
		expect(request.nodeName).toBeUndefined();
		expect(request.configureAdditionalData).toBeUndefined();
	});

	it('applies each run variable snapshot to ephemeral invocation without leaking tool data', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const instrumentToolAdditionalData = vi.fn();
		const nodeParameters = {
			channelId: '={{ $vars.channel }}',
			message:
				"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('message', 'Message', 'string') }}",
		};
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters },
			},
			{
				executor: { executeInline } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
				instrumentToolAdditionalData,
			},
		);
		const contexts = ['first', 'second'].map(
			(channel) => new AgentExpressionContext({ channel }, async (value) => value),
		);
		const inputs = contexts.map((_, index) => ({ message: `message-${index + 1}` }));

		await Promise.all(
			contexts.map(
				async (runtimeContext, index) => await tool.handler?.(inputs[index], { runtimeContext }),
			),
		);

		const requests = executeInline.mock.calls.map(([request]) => request) as Array<{
			nodeParameters: object;
			inputData: Array<{ json: object }>;
			configureAdditionalData?: (additionalData: { variables: object }) => void;
		}>;
		const snapshots = requests.map((request) => {
			const additionalData = { variables: { stale: true } };
			request.configureAdditionalData?.(additionalData);
			return additionalData.variables;
		});

		expect(snapshots).toEqual([{ channel: 'first' }, { channel: 'second' }]);
		expect(snapshots[0]).not.toBe(contexts[0].variables);
		expect(instrumentToolAdditionalData).toHaveBeenCalledTimes(2);
		expect(instrumentToolAdditionalData).toHaveBeenCalledWith(
			expect.objectContaining({ variables: { channel: 'first' } }),
			{ toolName: 'Google_Drive', toolKind: 'node' },
		);
		expect(
			requests.map(({ nodeParameters: parameters, inputData }) => ({ parameters, inputData })),
		).toEqual(
			inputs.map((input) => ({ parameters: nodeParameters, inputData: [{ json: input }] })),
		);
	});
});

describe('node tool run input schemas', () => {
	it('does not re-introspect a static schema for each run', async () => {
		const introspectSupplyDataToolSchema = vi.fn();

		await expect(
			resolveNodeToolInputSchemaForRun(
				baseToolSchema,
				{
					executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
					projectId: 'p1',
				},
				new AgentExpressionContext({}, async (value) => value),
			),
		).resolves.toBeUndefined();
		expect(introspectSupplyDataToolSchema).not.toHaveBeenCalled();
	});

	it('does not re-introspect when only the tool description is dynamic', async () => {
		const introspectSupplyDataToolSchema = vi.fn();
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Send a message' },
				supplyData: vi.fn(),
			}),
		} as unknown as NodeTypes);

		await expect(
			resolveNodeToolInputSchemaForRun(
				{ ...baseToolSchema, description: '={{ $vars.description }}' },
				{
					executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
					projectId: 'p1',
				},
				new AgentExpressionContext({ description: 'Send a message' }, async (value) => value),
			),
		).resolves.toBeUndefined();
		expect(introspectSupplyDataToolSchema).not.toHaveBeenCalled();
	});

	it('introspects each dynamic schema with its run variable snapshot', async () => {
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Send a message' },
				supplyData: vi.fn(),
			}),
		} as unknown as NodeTypes);
		const snapshots: string[] = [];
		const introspectSupplyDataToolSchema = vi.fn(
			async (request: {
				configureAdditionalData?: (additionalData: {
					variables: Record<string, unknown>;
				}) => void;
			}) => {
				const additionalData: { variables: Record<string, unknown> } = { variables: {} };
				request.configureAdditionalData?.(additionalData);
				const channel = String(additionalData.variables.channel);
				snapshots.push(channel);
				return z.object({ [channel]: z.string() });
			},
		);
		const toolSchema = {
			...baseToolSchema,
			node: {
				...baseToolSchema.node,
				nodeParameters: { channelId: '={{ $vars.channel }}' },
			},
		};
		const ctx = {
			executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
			projectId: 'p1',
		};
		const context = (channel: string) =>
			new AgentExpressionContext({ channel }, async (value) => value);

		const [firstSchema, secondSchema] = (await Promise.all([
			resolveNodeToolInputSchemaForRun(toolSchema, ctx, context('first')),
			resolveNodeToolInputSchemaForRun(toolSchema, ctx, context('second')),
		])) as z.ZodType[];

		expect(snapshots).toEqual(['first', 'second']);
		expect([
			firstSchema.safeParse({ first: 'channel' }).success,
			firstSchema.safeParse({ second: 'channel' }).success,
			secondSchema.safeParse({ first: 'channel' }).success,
			secondSchema.safeParse({ second: 'channel' }).success,
		]).toEqual([true, false, false, true]);
	});
});
