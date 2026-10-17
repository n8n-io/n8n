import type { AgentJsonToolConfig } from '@n8n/api-types';
import type { PolicyViolation } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { hasPolicyRefusalMarker, WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';
import { z } from 'zod';

import type { EphemeralNodeExecutor } from '@/node-execution';
import { NodeTypes } from '@/node-types';
import type { NonEmptyViolations } from '@/policy/policy-violation.error';

import { resolveNodeTool } from '../node-tool-factory';

const violation = (overrides: Partial<PolicyViolation> = {}): PolicyViolation => ({
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'The node type n8n-nodes-base.googleDrive is not available on this instance',
	subject: 'n8n-nodes-base.googleDrive',
	subjectType: 'nodeType',
	scope: 'instance',
	...overrides,
});

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

describe('resolveNodeTool → policy refusal', () => {
	it('returns a policy refusal in the serialized refusal shape instead of throwing', async () => {
		const violations: NonEmptyViolations = [violation()];
		const executeInline = vi.fn().mockResolvedValue({
			status: 'error',
			data: [],
			error: 'Node type is not permitted for agent tool execution',
			violations,
		});

		const tool = await resolveNodeTool(baseToolSchema, {
			executor: { executeInline } as unknown as EphemeralNodeExecutor,
			projectId: 'p1',
		});

		const output = await tool.handler!({}, {} as never);
		expect(output).toEqual({
			isPolicyRefusal: true,
			message: 'Node type is not permitted for agent tool execution',
			violations,
			instruction: expect.stringMatching(/do not retry/i),
		});
		expect(output).toMatchObject({ instruction: expect.stringMatching(/tell the user/i) });
		expect(hasPolicyRefusalMarker(output)).toBe(true);
	});

	it('throws for an ordinary executor error with no violations, as before', async () => {
		const executeInline = vi.fn().mockResolvedValue({
			status: 'error',
			data: [],
			error: 'boom',
		});

		const tool = await resolveNodeTool(baseToolSchema, {
			executor: { executeInline } as unknown as EphemeralNodeExecutor,
			projectId: 'p1',
		});

		await expect(tool.handler!({}, {} as never)).rejects.toThrow('boom');
	});
});

describe('toExecutorCredentials (credential mapping at execution)', () => {
	type NodeCredentials = Extract<AgentJsonToolConfig, { type: 'node' }>['node']['credentials'];

	async function credentialDetailsFor(credentials: NodeCredentials) {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{ ...baseToolSchema, node: { ...baseToolSchema.node, credentials } },
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);
		await tool.handler!({}, {} as never);
		return (executeInline.mock.calls[0][0] as { credentialDetails?: unknown }).credentialDetails;
	}

	it('carries an n8n Connect managed credential through with a null id and the flag', async () => {
		const details = await credentialDetailsFor({
			slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
		});
		expect(details).toEqual({
			slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
		});
	});

	it('carries a real and a managed credential together in a mixed map', async () => {
		const details = await credentialDetailsFor({
			slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			httpBasicAuth: { id: 'cred-1', name: 'Prod' },
		});
		expect(details).toEqual({
			slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			httpBasicAuth: { id: 'cred-1', name: 'Prod' },
		});
	});

	it('drops an unpersisted slot that is neither a real credential nor managed', async () => {
		const details = await credentialDetailsFor({ slackApi: { id: '', name: '' } });
		expect(details).toBeUndefined();
	});

	it('passes undefined when the node has no credentials', async () => {
		expect(await credentialDetailsFor(undefined)).toBeUndefined();
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
});

describe('resolveNodeTool → trusted metadata', () => {
	it('puts trusted metadata into the tool execution input and keeps `$fromAI` parameters wired', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		// The placeholder for the trusted key keeps the injected value reachable
		// from node parameters via `$fromAI('customer_id')` at node execution.
		const nodeParameters = {
			customerId: "={{ $fromAI('customer_id', 'The customer', 'string') }}",
			orderId: "={{ $fromAI('order_id', 'The order', 'string') }}",
		};
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters },
				trustedMetadata: {
					customer_id: { mode: 'fixed', value: 'cust_456' },
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		// Both placeholders would be advertised without trusted metadata; the
		// trusted key must not appear as a model-editable field.
		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		expect(Object.keys(schema.shape)).toEqual(['order_id']);

		await tool.handler!({ order_id: 'ORD-123' }, {} as never);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [
					{ json: { order_id: 'ORD-123', customer_id: 'cust_456', tenant_id: 'tenant_789' } },
				],
				nodeParameters,
			}),
		);
	});

	it('lets the injected trusted value win over a same-named model argument', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					customer_id: { mode: 'fixed', value: 'cust_456' },
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		await tool.handler!(
			{
				order_id: 'ORD-123',
				// The model invents an identity value the config trusted. It must
				// not reach the tool — tenant isolation depends on the runtime's
				// value, not on schema enforcement.
				customer_id: 'invented-by-the-model',
				tenant_id: 'invented-by-the-model',
			} as never,
			{} as never,
		);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [
					{ json: { order_id: 'ORD-123', customer_id: 'cust_456', tenant_id: 'tenant_789' } },
				],
			}),
		);
	});

	it('resolves expression metadata in a context without the model arguments', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const evaluateExpressions = vi.fn().mockResolvedValue({ tenant_id: 'tenant-789' });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'expression', value: '={{ $vars.tenantId }}' },
				},
			},
			{
				executor: { executeInline, evaluateExpressions } as unknown as EphemeralNodeExecutor,
				projectId: 'proj-1',
			},
		);

		await tool.handler!({ query: 'invoices' }, {} as never);

		// The evaluation context is the trusted-input context the workflow tool
		// factory uses, carrying no tool-call input: a metadata expression
		// cannot resolve `$json` (the model's arguments).
		expect(evaluateExpressions).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId: 'proj-1',
				nodeType: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
				nodeParameters: {},
				nodeName: 'Google_Drive',
			}),
			{ tenant_id: '={{ $vars.tenantId }}' },
			[],
		);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { query: 'invoices', tenant_id: 'tenant-789' } }],
			}),
		);
	});

	it('fails the tool call loudly when a metadata expression cannot resolve', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const evaluateExpressions = vi
			.fn()
			.mockRejectedValue(new Error('Cannot resolve input "tenant_id": no data'));
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'expression', value: '={{ $vars.tenantId }}' },
				},
			},
			{
				executor: { executeInline, evaluateExpressions } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		await expect(tool.handler!({ query: 'x' }, {} as never)).rejects.toThrow(
			/Cannot resolve input "tenant_id"/,
		);
		// The node must not run without its trusted value.
		expect(executeInline).not.toHaveBeenCalled();
	});

	it('strips trusted keys from an introspected zod schema', async () => {
		const introspectSupplyDataToolSchema = vi
			.fn()
			.mockResolvedValue(z.object({ tenant_id: z.string(), query: z.string() }));
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Search Wikipedia' },
				supplyData: vi.fn(),
			}),
		} as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{
				executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		expect(Object.keys(schema.shape)).toEqual(['query']);
	});

	it('strips trusted keys from an introspected JSON schema', async () => {
		const introspectSupplyDataToolSchema = vi.fn().mockResolvedValue({
			type: 'object',
			properties: { tenant_id: { type: 'string' }, query: { type: 'string' } },
			required: ['tenant_id', 'query'],
		});
		Container.set(NodeTypes, {
			getByNameAndVersion: vi.fn().mockReturnValue({
				description: { description: 'Search Wikipedia' },
				supplyData: vi.fn(),
			}),
		} as unknown as NodeTypes);

		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{
				executor: { introspectSupplyDataToolSchema } as unknown as EphemeralNodeExecutor,
				projectId: 'p1',
			},
		);

		const schema = tool.inputSchema as { properties: Record<string, unknown>; required?: string[] };
		expect(Object.keys(schema.properties)).toEqual(['query']);
		expect(schema.required).toEqual(['query']);
	});

	it('keeps existing configurations unchanged without trusted metadata', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: {
					...baseToolSchema.node,
					nodeParameters: {
						query:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('query', 'The query', 'string') }}",
					},
				},
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		const schema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
		expect(Object.keys(schema.shape)).toEqual(['query']);

		await tool.handler!({ query: 'n8n agents' }, {} as never);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { query: 'n8n agents' } }],
			}),
		);
	});

	it('lets the calling workflow override a declared trusted key at runtime', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		// The Message an Agent node resolves this mapping in the calling
		// workflow's context; the author's explicit mapping replaces the
		// tool's own binding for the invocation.
		await tool.handler!(
			{ order_id: 'ORD-123' } as never,
			{ runtimeMetadata: { tenant_id: 'caller-mapped' } } as never,
		);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { order_id: 'ORD-123', tenant_id: 'caller-mapped' } }],
			}),
		);
	});

	it('drops runtime values for undeclared names and inherited properties', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
				trustedMetadata: {
					tenant_id: { mode: 'fixed', value: 'tenant_789' },
				},
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		// A caller can only map values onto names the tool config already
		// declares as trusted; a prototype-seeded name must not be picked up.
		const runtime = Object.create({
			inherited_key: 'must-not-inject',
		}) as Record<string, unknown>;
		runtime.undeclared_key = 'must-not-inject';
		await tool.handler!({ order_id: 'ORD-123' } as never, { runtimeMetadata: runtime } as never);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { order_id: 'ORD-123', tenant_id: 'tenant_789' } }],
			}),
		);
	});

	it('ignores runtime metadata when the tool declares no trusted keys', async () => {
		const executeInline = vi.fn().mockResolvedValue({ status: 'success', data: [] });
		const tool = await resolveNodeTool(
			{
				...baseToolSchema,
				node: { ...baseToolSchema.node, nodeParameters: {} },
			},
			{ executor: { executeInline } as unknown as EphemeralNodeExecutor, projectId: 'p1' },
		);

		await tool.handler!(
			{ order_id: 'ORD-123' } as never,
			{ runtimeMetadata: { anything: 'value' } } as never,
		);

		expect(executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				inputData: [{ json: { order_id: 'ORD-123' } }],
			}),
		);
	});
});
