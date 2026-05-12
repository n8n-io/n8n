import type { AgentSnapshot, ToolDescriptor } from '@n8n/agents';
import type { JSONSchema7 } from 'json-schema';

import type { AgentJsonConfig } from '../json-config/agent-json-config';
import { AgentJsonConfigSchema } from '../json-config/agent-json-config';
import { buildFromJson } from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';

// ---------------------------------------------------------------------------
// buildFromJson() tests
// ---------------------------------------------------------------------------

describe('buildFromJson()', () => {
	const makeConfig = (overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig => ({
		name: 'test-agent',
		model: 'anthropic/claude-sonnet-4-5',
		credential: 'my-anthropic-key',
		instructions: 'You are a test agent.',
		...overrides,
	});

	const makeMockToolExecutor = (): ToolExecutor => ({
		executeTool: jest.fn().mockResolvedValue({ result: 'tool result' }),
	});

	const makeMockCredentialProvider = () => ({
		resolve: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		list: jest.fn().mockResolvedValue([]),
	});

	const makeToolDescriptor = (overrides: Partial<ToolDescriptor> = {}): ToolDescriptor => ({
		name: 'search',
		description: 'Search the web',
		systemInstruction: null,
		inputSchema: { type: 'object', properties: { query: { type: 'string' } } } as JSONSchema7,
		outputSchema: null,
		hasSuspend: false,
		hasResume: false,
		hasToMessage: false,
		requireApproval: false,
		providerOptions: null,
		...overrides,
	});

	const getMemoryConfig = (agent: unknown) =>
		(
			agent as {
				memoryConfig?: {
					lastMessages: number;
					workingMemory?: {
						template: string;
						structured: boolean;
						scope: 'resource' | 'thread';
						instruction?: string;
					};
				};
			}
		).memoryConfig;

	const makeMockMemoryFactory = () => jest.fn();

	it('sets name, model, and instructions', async () => {
		const agent = await buildFromJson(
			makeConfig(),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);
		const snap: AgentSnapshot = agent.snapshot;

		expect(snap.name).toBe('test-agent');
		expect(snap.model.provider).toBe('anthropic');
		expect(snap.model.name).toBe('claude-sonnet-4-5');
		expect(snap.instructions).toBe('You are a test agent.');
	});

	it('handles multi-slash model string for aggregator providers', async () => {
		const agent = await buildFromJson(
			makeConfig({ model: 'openrouter/amazon/nova-micro-v1' }),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		const snap: AgentSnapshot = agent.snapshot;
		// Provider is always everything before the FIRST slash.
		expect(snap.model.provider).toBe('openrouter');
		// Model name is everything after the first slash, including any further slashes.
		expect(snap.model.name).toBe('amazon/nova-micro-v1');
	});

	it('handles single-part model string (no slash)', async () => {
		const agent = await buildFromJson(
			makeConfig({ model: 'claude-sonnet-4-5' }),
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		const snap: AgentSnapshot = agent.snapshot;
		expect(snap.model.provider).toBeNull();
		expect(snap.model.name).toBe('claude-sonnet-4-5');
	});

	it('wires a custom tool', async () => {
		const descriptor = makeToolDescriptor({ name: 'my_search' });
		const config = makeConfig({ tools: [{ type: 'custom', id: 'search_tool' }] });

		const agent = await buildFromJson(
			config,
			{ search_tool: descriptor },
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'my_search')).toBe(true);
	});

	it('injects attached skill names, descriptions, and ids into instructions, but not bodies', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'skill_0Ab9ZkLm3Pq7Xy2N' }],
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				skills: {
					skill_0Ab9ZkLm3Pq7Xy2N: {
						name: 'Summarize notes',
						description: 'Use for meeting notes and transcripts',
						instructions: 'Extract decisions and action items.',
					},
				},
			},
		);

		const instructions = agent.snapshot.instructions ?? '';
		expect(instructions).toContain('Skill loading protocol:');
		expect(instructions).toContain('Skills are optional instruction packs, not execution tools');
		expect(instructions).toContain('Available skills:');
		expect(instructions).toContain('name: Summarize notes');
		expect(instructions).toContain('description: Use for meeting notes and transcripts');
		expect(instructions).toContain('id: skill_0Ab9ZkLm3Pq7Xy2N');
		expect(instructions).toContain("call load_skill once with that skill's id");
		expect(instructions).toContain('do not call load_skill again');
		expect(instructions).toContain('Do not load a skill just because it is listed here');
		expect(instructions).not.toContain('Extract decisions and action items.');
	});

	it('wires load_skill for attached skills and returns the selected skill body on demand', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				skills: {
					summarize_notes: {
						name: 'Summarize notes',
						description: 'Use for meeting notes and transcripts',
						instructions: 'Extract decisions and action items.',
					},
					unused_skill: {
						name: 'Unused skill',
						description: 'This is not attached',
						instructions: 'This should not load.',
					},
				},
			},
		);

		const loadSkill = agent.declaredTools.find((t) => t.name === 'load_skill');
		expect(loadSkill).toBeDefined();
		expect(loadSkill?.description).not.toContain('Summarize notes');
		expect(loadSkill?.systemInstruction).toBeUndefined();

		await expect(loadSkill!.handler?.({ skillId: 'summarize_notes' }, {})).resolves.toMatchObject({
			ok: true,
			skillId: 'summarize_notes',
			instructions: 'Extract decisions and action items.',
		});

		await expect(loadSkill!.handler?.({ skillId: 'unused_skill' }, {})).resolves.toMatchObject({
			ok: false,
		});
	});

	it('throws when a configured skill ref is missing its stored body', async () => {
		const config = makeConfig({
			skills: [{ type: 'skill', id: 'missing_skill' }],
		});

		await expect(
			buildFromJson(
				config,
				{},
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
					skills: {},
				},
			),
		).rejects.toThrow('Skill "missing_skill" not found in stored skill bodies');
	});

	it('throws when custom tool id is not found in descriptors', async () => {
		const config = makeConfig({ tools: [{ type: 'custom', id: 'missing_tool' }] });

		await expect(
			buildFromJson(
				config,
				{},
				{
					toolExecutor: makeMockToolExecutor(),
					credentialProvider: makeMockCredentialProvider(),
					memoryFactory: makeMockMemoryFactory(),
				},
			),
		).rejects.toThrow('Custom tool "missing_tool" not found in tool descriptors');
	});

	it('resolves workflow tool via resolveTool callback', async () => {
		const config = makeConfig({
			tools: [{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow' }],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'run_workflow')).toBe(true);
		expect(resolveTool).toHaveBeenCalledTimes(1);
	});

	it('wraps workflow tool with approval when requireApproval is true', async () => {
		const config = makeConfig({
			tools: [
				{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow', requireApproval: true },
			],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'run_workflow');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBe(true);
	});

	it('wraps node tool with approval when requireApproval is true', async () => {
		const config = makeConfig({
			tools: [
				{
					type: 'node',
					name: 'my_node_tool',
					description: 'A node tool',
					node: { nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 1, nodeParameters: {} },
					requireApproval: true,
				},
			],
		});

		const resolvedTool = {
			name: 'my_node_tool',
			description: 'A node tool',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'my_node_tool');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBe(true);
	});

	it('does not wrap workflow tool with approval when requireApproval is not set', async () => {
		const config = makeConfig({
			tools: [{ type: 'workflow', workflow: 'My Workflow', name: 'run_workflow' }],
		});

		const resolvedTool = {
			name: 'run_workflow',
			description: 'Run My Workflow',
			handler: jest.fn().mockResolvedValue({ done: true }),
		};
		const resolveTool = jest.fn().mockResolvedValue(resolvedTool);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
				resolveTool,
			},
		);

		const tool = agent.declaredTools.find((t) => t.name === 'run_workflow');
		expect(tool).toBeDefined();
		expect(tool!.withDefaultApproval).toBeUndefined();
	});

	it('falls back to marker tool when resolveTool is not provided for workflow tools', async () => {
		const config = makeConfig({ tools: [{ type: 'workflow', workflow: 'Test Workflow' }] });

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.tools.some((t) => t.name === 'Test Workflow')).toBe(true);
	});

	it('sets thinking config', async () => {
		const config = makeConfig({
			config: { thinking: { provider: 'anthropic', budgetTokens: 5000 } },
		});

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);
		const snap: AgentSnapshot = agent.snapshot;

		expect(snap.thinking).not.toBeNull();
		expect(snap.thinking).toMatchObject({ budgetTokens: 5000 });
	});

	it('sets toolCallConcurrency', async () => {
		const config = makeConfig({ config: { toolCallConcurrency: 5 } });

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory: makeMockMemoryFactory(),
			},
		);

		expect(agent.snapshot.toolCallConcurrency).toBe(5);
	});

	it('configures memory when enabled', async () => {
		const mockMemory = {
			getThread: jest.fn(),
			saveThread: jest.fn(),
			deleteThread: jest.fn(),
			getMessages: jest.fn().mockResolvedValue([]),
			saveMessages: jest.fn(),
			deleteMessages: jest.fn(),
			describe: jest
				.fn()
				.mockReturnValue({ name: 'n8n', constructorName: 'N8nMemory', connectionParams: null }),
			close: jest.fn(),
		};

		const config = makeConfig({
			memory: { enabled: true, storage: 'n8n', lastMessages: 15 },
		});

		const memoryFactory = jest.fn().mockReturnValue(mockMemory);

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory,
			},
		);

		expect(memoryFactory).toHaveBeenCalledWith(config.memory);
		expect(agent.snapshot.hasMemory).toBe(true);
		expect(getMemoryConfig(agent)?.lastMessages).toBe(15);
		expect(getMemoryConfig(agent)?.workingMemory).toMatchObject({
			structured: false,
			scope: 'thread',
		});
		expect(getMemoryConfig(agent)?.workingMemory?.template).toContain('Thread memory');
		expect(getMemoryConfig(agent)?.workingMemory?.template).toContain('Current goal/task');
		expect(getMemoryConfig(agent)?.workingMemory?.template).toContain('Key active items');
		expect(getMemoryConfig(agent)?.workingMemory?.template).toContain('Resolved or superseded');
		expect(getMemoryConfig(agent)?.workingMemory?.instruction).toContain('thread-scoped');
		expect(getMemoryConfig(agent)?.workingMemory?.instruction).toContain('current-state snapshot');
		expect(getMemoryConfig(agent)?.workingMemory?.instruction).toContain(
			'primary, secondary, active, resolved, and superseded',
		);
	});

	it('skips memory when memory.enabled is false', async () => {
		const config = makeConfig({ memory: { enabled: false, storage: 'n8n' } });

		const memoryFactory = jest.fn();

		const agent = await buildFromJson(
			config,
			{},
			{
				toolExecutor: makeMockToolExecutor(),
				credentialProvider: makeMockCredentialProvider(),
				memoryFactory,
			},
		);

		expect(memoryFactory).not.toHaveBeenCalled();
		expect(agent.snapshot.hasMemory).toBe(false);
		expect(getMemoryConfig(agent)).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// AgentJsonConfig Zod schema validation
// ---------------------------------------------------------------------------

describe('AgentJsonConfigSchema', () => {
	it('parses a minimal valid config', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).not.toThrow();
	});

	it('rejects invalid model format (no slash)', () => {
		const config = {
			name: 'test',
			model: 'invalid-no-slash',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('accepts multi-slash model format for aggregator providers', () => {
		const config = {
			name: 'test',
			model: 'openrouter/amazon/nova-micro-v1',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).not.toThrow();
	});

	it('accepts deeply-nested model format', () => {
		const config = {
			name: 'test',
			model: 'openrouter/openai/gpt-4o',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.model).toBe('openrouter/openai/gpt-4o');
	});

	it('rejects model with consecutive slashes', () => {
		const config = {
			name: 'test',
			model: 'openrouter//nova-micro-v1',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects model with trailing slash', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5/',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects model with leading slash in model segment', () => {
		const config = {
			name: 'test',
			model: 'anthropic//claude-sonnet-4-5',
			credential: 'my-key',
			instructions: 'Be helpful.',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects empty name', () => {
		const config = {
			name: '',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects name longer than 128 chars', () => {
		const config = {
			name: 'a'.repeat(129),
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses custom tool ref with valid id', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [{ type: 'custom', id: 'my_tool_1' }],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.tools?.[0]).toMatchObject({ type: 'custom', id: 'my_tool_1' });
	});

	it('rejects inputSchema on node tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [
				{
					type: 'node',
					name: 'http_request',
					description: 'Make an HTTP request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
						nodeParameters: {
							url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
						},
					},
					inputSchema: {
						type: 'object',
						properties: { url: { type: 'string' } },
						required: ['url'],
					},
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects id on node tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [
				{
					type: 'node',
					id: 'tool-ref-1',
					name: 'http_request',
					description: 'Make an HTTP request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
						nodeParameters: {
							url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
						},
					},
				},
			],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects id on workflow tool configs', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'You are helpful',
			tools: [{ type: 'workflow', id: 'tool-ref-1', workflow: 'Send Welcome Email' }],
		};

		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('rejects custom tool ref with invalid id characters', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			tools: [{ type: 'custom', id: 'tool id' }],
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses an integrations array containing schedule + chat triggers', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 0 * * *',
					wakeUpPrompt: 'tick',
				},
				{ type: 'slack', credentialId: 'cred-1', credentialName: 'Acme Slack' },
			],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.integrations).toHaveLength(2);
		expect(parsed.integrations?.[0]).toMatchObject({ type: 'schedule', active: false });
		expect(parsed.integrations?.[1]).toMatchObject({
			type: 'slack',
			credentialId: 'cred-1',
			credentialName: 'Acme Slack',
		});
	});

	it('rejects a chat integration missing credentialName at the schema level', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [{ type: 'slack', credentialId: 'cred-1' }],
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});

	it('parses an integrations array containing schedule + chat triggers', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 0 * * *',
					wakeUpPrompt: 'tick',
				},
				{ type: 'slack', credentialId: 'cred-1', credentialName: 'Acme Slack' },
			],
		};
		const parsed = AgentJsonConfigSchema.parse(config);
		expect(parsed.integrations).toHaveLength(2);
		expect(parsed.integrations?.[0]).toMatchObject({ type: 'schedule', active: false });
		expect(parsed.integrations?.[1]).toMatchObject({
			type: 'slack',
			credentialId: 'cred-1',
			credentialName: 'Acme Slack',
		});
	});

	it('rejects a chat integration missing credentialName at the schema level', () => {
		const config = {
			name: 'test',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'my-key',
			instructions: '',
			integrations: [{ type: 'slack', credentialId: 'cred-1' }],
		};
		expect(() => AgentJsonConfigSchema.parse(config)).toThrow();
	});
});
