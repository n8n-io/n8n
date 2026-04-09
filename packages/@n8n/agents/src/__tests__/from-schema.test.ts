import { z } from 'zod';

import { Agent } from '../sdk/agent';
import { isSuspendResult } from '../sdk/from-schema';
import type { HandlerExecutor } from '../types/sdk/handler-executor';
import type { AgentSchema, ToolSchema } from '../types/sdk/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockExecutor(): HandlerExecutor {
	return {
		executeTool: jest.fn().mockResolvedValue({ result: 'mocked' }),
		executeToMessage: jest.fn().mockResolvedValue(undefined),
		executeEval: jest.fn().mockResolvedValue({ score: 1 }),
		evaluateSchema: jest.fn().mockResolvedValue(undefined),
		evaluateExpression: jest.fn().mockResolvedValue(undefined),
	};
}

function minimalSchema(overrides: Partial<AgentSchema> = {}): AgentSchema {
	return {
		model: { provider: 'anthropic', name: 'claude-sonnet-4-5' },
		credential: 'my-credential',
		instructions: 'You are helpful.',
		description: null,
		tools: [],
		providerTools: [],
		memory: null,
		evaluations: [],
		guardrails: [],
		mcp: null,
		telemetry: null,
		checkpoint: null,
		config: {
			structuredOutput: { enabled: false, schemaSource: null },
			thinking: null,
			toolCallConcurrency: null,
			requireToolApproval: false,
		},
		...overrides,
	};
}

function makeToolSchema(overrides: Partial<ToolSchema> = {}): ToolSchema {
	return {
		name: 'test-tool',
		description: 'A test tool',
		type: 'custom',
		editable: true,
		inputSchemaSource: null,
		outputSchemaSource: null,
		handlerSource: null,
		suspendSchemaSource: null,
		resumeSchemaSource: null,
		toMessageSource: null,
		requireApproval: false,
		needsApprovalFnSource: null,
		providerOptions: null,
		inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
		outputSchema: null,
		hasSuspend: false,
		hasResume: false,
		hasToMessage: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent.fromSchema()', () => {
	it('reconstructs basic agent config', async () => {
		const schema = minimalSchema();
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.model).toEqual({ provider: 'anthropic', name: 'claude-sonnet-4-5' });
		expect(described.credential).toBe('my-credential');
		expect(described.instructions).toBe('You are helpful.');
	});

	it('reconstructs model with only name (no provider)', async () => {
		const schema = minimalSchema({
			model: { provider: null, name: 'gpt-4o' },
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.model).toEqual({ provider: null, name: 'gpt-4o' });
	});

	it('reconstructs thinking config with correct provider arg', async () => {
		const schema = minimalSchema({
			config: {
				structuredOutput: { enabled: false, schemaSource: null },
				thinking: { provider: 'anthropic', budgetTokens: 10000 },
				toolCallConcurrency: null,
				requireToolApproval: false,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.config.thinking).toEqual({
			provider: 'anthropic',
			budgetTokens: 10000,
		});
	});

	it('reconstructs openai thinking config', async () => {
		const schema = minimalSchema({
			model: { provider: 'openai', name: 'o3-mini' },
			config: {
				structuredOutput: { enabled: false, schemaSource: null },
				thinking: { provider: 'openai', reasoningEffort: 'high' },
				toolCallConcurrency: null,
				requireToolApproval: false,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.config.thinking).toEqual({
			provider: 'openai',
			reasoningEffort: 'high',
		});
	});

	it('creates proxy handlers for custom tools', async () => {
		const toolSchema = makeToolSchema({
			name: 'search',
			description: 'Search the web',
		});
		const schema = minimalSchema({ tools: [toolSchema] });
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.tools).toHaveLength(1);
		expect(described.tools[0].name).toBe('search');
		expect(described.tools[0].description).toBe('Search the web');
		expect(described.tools[0].editable).toBe(true);
	});

	it('adds WorkflowTool markers for non-editable tools', async () => {
		const toolSchema = makeToolSchema({ name: 'Send Email', type: 'workflow', editable: false });
		const schema = minimalSchema({ tools: [toolSchema] });
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		// Non-editable tools become WorkflowTool markers in declaredTools
		const markers = agent.declaredTools.filter(
			(t) => '__workflowTool' in t && (t as Record<string, unknown>).__workflowTool === true,
		);
		expect(markers).toHaveLength(1);
		expect(markers[0].name).toBe('Send Email');
	});

	it('reconstructs memory from schema fields', async () => {
		const schema = minimalSchema({
			memory: {
				source: null,
				storage: 'memory',
				lastMessages: 20,
				semanticRecall: null,
				workingMemory: null,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.memory).toBeTruthy();
		expect(described.memory!.lastMessages).toBe(20);
		expect(described.memory!.storage).toBe('memory');
	});

	it('sets toolCallConcurrency when specified', async () => {
		const schema = minimalSchema({
			config: {
				structuredOutput: { enabled: false, schemaSource: null },
				thinking: null,
				toolCallConcurrency: 5,
				requireToolApproval: false,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.config.toolCallConcurrency).toBe(5);
	});

	it('sets requireToolApproval when true', async () => {
		const schema = minimalSchema({
			config: {
				structuredOutput: { enabled: false, schemaSource: null },
				thinking: null,
				toolCallConcurrency: null,
				requireToolApproval: true,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.config.requireToolApproval).toBe(true);
	});

	it('sets checkpoint when specified', async () => {
		const schema = minimalSchema({ checkpoint: 'memory' });
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		const described = agent.describe();

		expect(described.checkpoint).toBe('memory');
	});

	it('delegates tool execution to handlerExecutor', async () => {
		const executor = mockExecutor();
		const toolSchema = makeToolSchema({ name: 'my-tool' });
		const schema = minimalSchema({ tools: [toolSchema] });
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		// Access the built tool's handler via declaredTools
		const tools = agent.declaredTools;
		expect(tools).toHaveLength(1);

		const result = await tools[0].handler!({ query: 'test' }, { parentTelemetry: undefined });
		expect(executor.executeTool).toHaveBeenCalledWith(
			'my-tool',
			{ query: 'test' },
			{ parentTelemetry: undefined },
		);
		expect(result).toEqual({ result: 'mocked' });
	});

	it('reconstructs guardrails with correct position', async () => {
		const schema = minimalSchema({
			guardrails: [
				{
					name: 'pii-guard',
					guardType: 'pii',
					strategy: 'redact',
					position: 'input',
					config: { detectionTypes: ['email', 'phone'] },
					source: '',
				},
				{
					name: 'mod-guard',
					guardType: 'moderation',
					strategy: 'block',
					position: 'output',
					config: {},
					source: '',
				},
			],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});
		const described = agent.describe();

		expect(described.guardrails).toHaveLength(2);
		expect(described.guardrails[0].name).toBe('pii-guard');
		expect(described.guardrails[0].position).toBe('input');
		expect(described.guardrails[0].guardType).toBe('pii');
		expect(described.guardrails[1].name).toBe('mod-guard');
		expect(described.guardrails[1].position).toBe('output');
	});

	it('reconstructs evals with proxy _run', async () => {
		const executor = mockExecutor();
		const schema = minimalSchema({
			evaluations: [
				{
					name: 'accuracy',
					description: 'Check accuracy',
					type: 'check',
					modelId: null,
					credentialName: null,
					hasCredential: false,
					handlerSource: null,
				},
				{
					name: 'quality',
					description: 'Judge quality',
					type: 'judge',
					modelId: 'anthropic/claude-sonnet-4-5',
					credentialName: 'anthropic',
					hasCredential: true,
					handlerSource: null,
				},
			],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});
		const described = agent.describe();

		expect(described.evaluations).toHaveLength(2);
		expect(described.evaluations[0].name).toBe('accuracy');
		expect(described.evaluations[0].type).toBe('check');
		expect(described.evaluations[1].name).toBe('quality');
		expect(described.evaluations[1].type).toBe('judge');
	});

	it('reconstructs provider tools', async () => {
		const schema = minimalSchema({
			providerTools: [{ name: 'anthropic.web_search_20250305', source: '' }],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});
		const described = agent.describe();

		expect(described.providerTools).toHaveLength(1);
		expect(described.providerTools[0].name).toBe('anthropic.web_search_20250305');
	});

	it('evaluates provider tool source via evaluateExpression', async () => {
		const executor = mockExecutor();
		(executor.evaluateExpression as jest.Mock).mockResolvedValue({
			name: 'anthropic.web_search_20250305',
			args: { maxUses: 5 },
		});
		const schema = minimalSchema({
			providerTools: [
				{
					name: 'anthropic.web_search_20250305',
					source: 'providerTools.anthropicWebSearch({ maxUses: 5 })',
				},
			],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});
		const described = agent.describe();

		expect(executor.evaluateExpression).toHaveBeenCalledWith(
			'providerTools.anthropicWebSearch({ maxUses: 5 })',
		);
		expect(described.providerTools).toHaveLength(1);
		expect(described.providerTools[0].name).toBe('anthropic.web_search_20250305');
	});

	it('evaluates structuredOutput schema via evaluateSchema', async () => {
		const zodSchema = z.object({ answer: z.string() });
		const executor = mockExecutor();
		(executor.evaluateSchema as jest.Mock).mockResolvedValue(zodSchema);
		const schema = minimalSchema({
			config: {
				structuredOutput: { enabled: true, schemaSource: 'z.object({ answer: z.string() })' },
				thinking: null,
				toolCallConcurrency: null,
				requireToolApproval: false,
			},
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		const described = agent.describe();

		expect(executor.evaluateSchema).toHaveBeenCalledWith('z.object({ answer: z.string() })');
		expect(described.config.structuredOutput.enabled).toBe(true);
	});

	it('handles suspend result detection via isSuspendResult', () => {
		const suspendMarker = Symbol.for('n8n.agent.suspend');
		const suspendResult = { [suspendMarker]: true, payload: { message: 'approve?' } };
		const nonSuspend = { result: 42 };

		expect(isSuspendResult(suspendResult)).toBe(true);
		expect(isSuspendResult(nonSuspend)).toBe(false);
		expect(isSuspendResult(null)).toBe(false);
		expect(isSuspendResult(undefined)).toBe(false);
	});

	it('delegates interruptible tool execution with suspend detection', async () => {
		const suspendMarker = Symbol.for('n8n.agent.suspend');
		const executor = {
			...mockExecutor(),
			executeTool: jest.fn().mockResolvedValue({
				[suspendMarker]: true,
				payload: { message: 'Please approve' },
			}),
		};

		const toolSchema = makeToolSchema({
			name: 'suspend-tool',
			hasSuspend: true,
		});
		const schema = minimalSchema({ tools: [toolSchema] });
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		const tools = agent.declaredTools;
		expect(tools).toHaveLength(1);

		// Call with an interruptible context
		let suspendedPayload: unknown;
		const ctx = {
			parentTelemetry: undefined,
			resumeData: undefined,
			// eslint-disable-next-line @typescript-eslint/require-await
			suspend: jest.fn().mockImplementation(async (payload: unknown) => {
				suspendedPayload = payload;
				return { suspended: true };
			}),
		};

		await tools[0].handler!({ query: 'test' }, ctx);

		expect(ctx.suspend).toHaveBeenCalledWith({ message: 'Please approve' });
		expect(suspendedPayload).toEqual({ message: 'Please approve' });
	});

	it('reconstructs requireApproval on individual tools', async () => {
		const toolSchema = makeToolSchema({
			name: 'danger-tool',
			requireApproval: true,
		});
		const schema = minimalSchema({
			tools: [toolSchema],
			checkpoint: 'memory',
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: mockExecutor(),
		});

		// The tool should be wrapped for approval, which adds suspendSchema
		const tools = agent.declaredTools;
		expect(tools).toHaveLength(1);
		expect(tools[0].suspendSchema).toBeDefined();
	});

	it('reconstructs MCP servers by evaluating configSource', async () => {
		const executor = mockExecutor();
		(executor.evaluateExpression as jest.Mock).mockResolvedValue({
			name: 'browser',
			url: 'http://localhost:9222/mcp',
			transport: 'streamableHttp',
		});

		const schema = minimalSchema({
			mcp: [
				{
					name: 'browser',
					configSource:
						'({ name: "browser", url: "http://localhost:9222/mcp", transport: "streamableHttp" })',
				},
			],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		expect(executor.evaluateExpression).toHaveBeenCalledWith(
			'({ name: "browser", url: "http://localhost:9222/mcp", transport: "streamableHttp" })',
		);

		const described = agent.describe();
		expect(described.mcp).toHaveLength(1);
		expect(described.mcp![0].name).toBe('browser');
	});

	it('reconstructs multiple MCP servers', async () => {
		const executor = mockExecutor();
		(executor.evaluateExpression as jest.Mock)
			.mockResolvedValueOnce({
				name: 'browser',
				url: 'http://localhost:9222/mcp',
				transport: 'streamableHttp',
			})
			.mockResolvedValueOnce({
				name: 'fs',
				command: 'npx',
				args: ['@anthropic/mcp-fs', '/tmp'],
			});

		const schema = minimalSchema({
			mcp: [
				{ name: 'browser', configSource: 'browserConfig' },
				{ name: 'fs', configSource: 'fsConfig' },
			],
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		const described = agent.describe();
		expect(described.mcp).toHaveLength(2);
		expect(described.mcp![0].name).toBe('browser');
		expect(described.mcp![1].name).toBe('fs');
	});

	it('skips MCP servers with empty configSource', async () => {
		const schema = minimalSchema({
			mcp: [{ name: 'browser', configSource: '' }],
		});
		const executor = mockExecutor();
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		expect(executor.evaluateExpression).not.toHaveBeenCalled();
		// No MCP configs evaluated means no client is added
		const described = agent.describe();
		expect(described.mcp).toBeNull();
	});

	it('reconstructs telemetry by evaluating source', async () => {
		const executor = mockExecutor();
		(executor.evaluateExpression as jest.Mock).mockResolvedValue({
			enabled: true,
			functionId: 'my-agent',
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
		});

		const schema = minimalSchema({
			telemetry: { source: 'new Telemetry().functionId("my-agent").build()' },
		});
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		expect(executor.evaluateExpression).toHaveBeenCalledWith(
			'new Telemetry().functionId("my-agent").build()',
		);

		const described = agent.describe();
		expect(described.telemetry).not.toBeNull();
	});

	it('does not set telemetry when schema has no telemetry', async () => {
		const schema = minimalSchema({ telemetry: null });
		const executor = mockExecutor();
		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		const described = agent.describe();
		expect(described.telemetry).toBeNull();
		expect(executor.evaluateExpression).not.toHaveBeenCalled();
	});

	it('evaluates suspend/resume schemas via evaluateSchema', async () => {
		const suspendSchema = z.object({ reason: z.string() });
		const resumeSchema = z.object({ approved: z.boolean() });

		const executor = mockExecutor();
		(executor.evaluateSchema as jest.Mock)
			.mockResolvedValueOnce(suspendSchema)
			.mockResolvedValueOnce(resumeSchema);

		const toolSchema = makeToolSchema({
			name: 'interruptible-tool',
			hasSuspend: true,
			hasResume: true,
			suspendSchemaSource: 'z.object({ reason: z.string() })',
			resumeSchemaSource: 'z.object({ approved: z.boolean() })',
		});
		const schema = minimalSchema({ tools: [toolSchema] });

		const agent = await Agent.fromSchema(schema, 'test-agent', {
			handlerExecutor: executor,
		});

		const tools = agent.declaredTools;
		expect(tools).toHaveLength(1);
		expect(tools[0].suspendSchema).toBe(suspendSchema);
		expect(tools[0].resumeSchema).toBe(resumeSchema);
	});
});
