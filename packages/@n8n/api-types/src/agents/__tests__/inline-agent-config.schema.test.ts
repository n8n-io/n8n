import {
	InlineAgentConfigSchema,
	InlineAgentJsonConfigSchema,
	RunnableInlineAgentConfigSchema,
} from '../inline-agent-config.schema';

const baseConfig = {
	name: 'Inline Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-1',
	instructions: 'Help users',
};

describe('InlineAgentJsonConfigSchema', () => {
	it('accepts the minimal inline shape', () => {
		expect(InlineAgentJsonConfigSchema.safeParse(baseConfig).success).toBe(true);
	});

	it('accepts workflow and node tools', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [
				{ type: 'workflow', workflow: 'Lookup Orders' },
				{
					type: 'node',
					name: 'HTTP Request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4.4,
						nodeParameters: { url: 'https://example.com' },
					},
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts mcpServers (deliberately in inline scope)', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			mcpServers: [{ name: 'docs', url: 'https://mcp.example.com' }],
		});
		expect(result.success).toBe(true);
	});

	it('rejects custom (code) tools — their bodies live on saved agents', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [{ type: 'custom', id: 'my_tool' }],
		});
		expect(result.success).toBe(false);
	});

	it.each([
		['workflow', { type: 'workflow', workflow: 'Lookup Orders', requireApproval: true }],
		[
			'node',
			{
				type: 'node',
				name: 'HTTP Request',
				requireApproval: true,
				node: {
					nodeType: 'n8n-nodes-base.httpRequestTool',
					nodeTypeVersion: 4.4,
					nodeParameters: {},
				},
			},
		],
	])(
		'rejects requireApproval on %s tools — suspension cannot resume in workflow context',
		(_type, tool) => {
			const result = InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, tools: [tool] });
			expect(result.success).toBe(false);
		},
	);

	it.each([
		['skills', { skills: [{ type: 'skill', id: 'triage' }] }],
		['memory', { memory: { enabled: true, storage: 'n8n' } }],
		['subAgents', { subAgents: [{ id: 'a' }] }],
		['config options block', { config: { webSearch: { enabled: true } } }],
	])('rejects saved-agent-only keys (%s) via strict parsing', (_key, extra) => {
		expect(InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, ...extra }).success).toBe(false);
	});

	it('enforces name bounds (1..128)', () => {
		expect(InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: '' }).success).toBe(false);
		expect(
			InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: 'x'.repeat(128) }).success,
		).toBe(true);
		expect(
			InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: 'x'.repeat(129) }).success,
		).toBe(false);
	});

	it('accepts a draft (empty model, no credential)', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			model: '',
			credential: undefined,
		});
		expect(result.success).toBe(true);
	});
});

describe('RunnableInlineAgentConfigSchema', () => {
	it('accepts a runnable config', () => {
		expect(RunnableInlineAgentConfigSchema.safeParse({ config: baseConfig }).success).toBe(true);
	});

	it.each([
		['empty model', { ...baseConfig, model: '' }],
		['missing credential', { ...baseConfig, credential: undefined }],
		['whitespace-only credential', { ...baseConfig, credential: '   ' }],
	])('rejects an unrunnable draft (%s)', (_case, config) => {
		expect(RunnableInlineAgentConfigSchema.safeParse({ config }).success).toBe(false);
	});
});

describe('InlineAgentConfigSchema', () => {
	it('rejects unknown wrapper keys', () => {
		const result = InlineAgentConfigSchema.safeParse({ config: baseConfig, extra: true });
		expect(result.success).toBe(false);
	});
});
