import { AgentJsonConfigSchema } from '../agent-json-config.schema';
import { sanitizeAgentJsonConfig } from '../sanitize-agent-json-config';
import { SUB_AGENT_MAX_CHILDREN_MAX, SUB_AGENT_MAX_CHILDREN_MIN } from '../sub-agent.schema';

const baseConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('sanitizeAgentJsonConfig', () => {
	it('returns non-object payloads unchanged', () => {
		expect(sanitizeAgentJsonConfig(null)).toBe(null);
		expect(sanitizeAgentJsonConfig('config')).toBe('config');
		expect(sanitizeAgentJsonConfig([])).toEqual([]);
	});

	it('leaves a clean config unchanged', () => {
		const config = {
			...baseConfig,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
			tools: [{ type: 'custom', id: 'my_tool' }],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
	});

	it('does not add omitted optional schema keys', () => {
		const sanitized = sanitizeAgentJsonConfig(baseConfig);

		expect(sanitized).toStrictEqual(baseConfig);
		expect(Object.keys(sanitized as Record<string, unknown>).sort()).toEqual([
			'instructions',
			'model',
			'name',
		]);
	});

	it('strips unknown top-level keys before validation', () => {
		expect(
			sanitizeAgentJsonConfig({
				...baseConfig,
				legacyTopLevelField: 'removed',
			}),
		).toEqual(baseConfig);
	});

	it('strips unknown nested object keys before validation', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				maxChildren: 3,
				agents: [
					{
						agentId: 'agent-2',
						useWhen: 'Use for research tasks.',
						legacyLabel: 'Research',
					},
				],
				legacyBudget: 99,
			},
			config: {
				toolCallConcurrency: 2,
				webSearch: { enabled: true, provider: 'native', legacyProviderSetting: true },
				nodeTools: { enabled: true, legacyNodeToolSetting: true },
				legacyRuntimeSetting: true,
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for research tasks.' }],
			},
			config: {
				toolCallConcurrency: 2,
				webSearch: { enabled: true, provider: 'native' },
			},
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('strips unknown keys from supported typed-array entries', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			tools: [
				{
					type: 'workflow',
					workflow: 'wf-1',
					name: 'Run workflow',
					legacyWorkflowField: true,
				},
				{
					type: 'node',
					name: 'Send message',
					description: 'Sends a message',
					node: {
						nodeType: 'n8n-nodes-base.slack',
						nodeTypeVersion: 1,
						nodeParameters: {
							channel: '#support',
							arbitraryRuntimeParameter: true,
						},
						credentials: {
							slackApi: {
								id: 'cred-1',
								name: 'Slack',
								legacyCredentialField: true,
							},
						},
						legacyNodeConfigField: true,
					},
					legacyNodeToolField: true,
				},
			],
		});

		expect(sanitized).toEqual({
			...baseConfig,
			tools: [
				{
					type: 'workflow',
					workflow: 'wf-1',
					name: 'Run workflow',
				},
				{
					type: 'node',
					name: 'Send message',
					description: 'Sends a message',
					node: {
						nodeType: 'n8n-nodes-base.slack',
						nodeTypeVersion: 1,
						nodeParameters: {
							channel: '#support',
							arbitraryRuntimeParameter: true,
						},
						credentials: {
							slackApi: {
								id: 'cred-1',
								name: 'Slack',
							},
						},
					},
				},
			],
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('strips unknown keys from strict nested MCP config schemas', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			mcpServers: [
				{
					name: 'github',
					description: 'GitHub tools',
					url: 'https://example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'bearerAuth',
					credential: 'cred-github',
					metadata: {
						nodeTypeName: '@n8n/mcp-registry.github',
						legacyMetadataField: true,
					},
					toolFilter: {
						mode: 'allow',
						tools: ['create_issue'],
						legacyToolFilterField: true,
					},
					approval: {
						mode: 'selected',
						tools: ['create_issue'],
						legacyApprovalField: true,
					},
					connectionTimeoutMs: 10_000,
					legacyServerField: true,
				},
			],
		});

		expect(sanitized).toEqual({
			...baseConfig,
			mcpServers: [
				{
					name: 'github',
					description: 'GitHub tools',
					url: 'https://example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'bearerAuth',
					credential: 'cred-github',
					metadata: {
						nodeTypeName: '@n8n/mcp-registry.github',
					},
					toolFilter: {
						mode: 'allow',
						tools: ['create_issue'],
					},
					approval: {
						mode: 'selected',
						tools: ['create_issue'],
					},
					connectionTimeoutMs: 10_000,
				},
			],
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('strips unsupported integration types such as the removed schedule integration', () => {
		const config = {
			...baseConfig,
			integrations: [
				{ type: 'schedule', active: false, cronExpression: '0 8 * * 1' },
				{ type: 'slack', credentialId: 'cred-slack' },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		});
	});

	it('strips unsupported tool types while keeping supported ones', () => {
		const config = {
			...baseConfig,
			tools: [
				{ type: 'legacy_tool', id: 'old' },
				{ type: 'custom', id: 'my_tool' },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			tools: [{ type: 'custom', id: 'my_tool' }],
		});
	});

	it('keeps known integration types with invalid required fields so validation can fail', () => {
		const config = {
			...baseConfig,
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings: { accessMode: 'private', allowedUsers: [] },
				},
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
		expect(AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(config)).success).toBe(false);
	});

	it('sanitizes a realistic legacy agent config and leaves the remainder schema-valid', () => {
		const legacyConfig = {
			name: 'General Purpose Agent',
			model: 'openai/gpt-5.5',
			instructions: 'You are a helpful assistant.',
			tools: [],
			skills: [],
			credential: '14YEs5SRPfAflDJG',
			memory: {
				enabled: true,
				storage: 'n8n',
				observationalMemory: { enabled: true },
			},
			providerTools: {
				'openai.web_search': {
					externalWebAccess: true,
					searchContextSize: 'medium',
				},
			},
			config: {
				webSearch: { enabled: true },
			},
			integrations: [
				{
					type: 'schedule',
					active: false,
					cronExpression: '0 8 * * 1',
					wakeUpPrompt: 'Check priorities for the week.',
				},
			],
			legacyTopLevelField: 'should survive until schema parse',
		};

		const sanitized = sanitizeAgentJsonConfig(legacyConfig);
		expect(sanitized).toMatchObject({
			name: legacyConfig.name,
			model: legacyConfig.model,
			instructions: legacyConfig.instructions,
			tools: [],
			skills: [],
			credential: legacyConfig.credential,
			memory: legacyConfig.memory,
			providerTools: legacyConfig.providerTools,
			config: legacyConfig.config,
			integrations: [],
		});
		expect(sanitized).not.toHaveProperty('legacyTopLevelField');

		const parsed = AgentJsonConfigSchema.safeParse(sanitized);
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.data.integrations).toEqual([]);
	});

	it('strips unsupported entries across integrations, tools, skills, and tasks in one pass', () => {
		const config = {
			...baseConfig,
			integrations: [
				{ type: 'schedule', cronExpression: '0 9 * * *' },
				{ type: 'linear', credentialId: 'cred-linear' },
			],
			tools: [
				{ type: 'skill', id: 'wrong_collection' },
				{ type: 'workflow', workflow: 'wf-1' },
			],
			skills: [
				{ type: 'custom', id: 'wrong_collection' },
				{ type: 'skill', id: 'summarize' },
			],
			tasks: [
				{ type: 'schedule', id: 'legacy_task', enabled: true },
				{ type: 'task', id: 'weekly_review', enabled: true },
			],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual({
			...baseConfig,
			integrations: [{ type: 'linear', credentialId: 'cred-linear' }],
			tools: [{ type: 'workflow', workflow: 'wf-1' }],
			skills: [{ type: 'skill', id: 'summarize' }],
			tasks: [{ type: 'task', id: 'weekly_review', enabled: true }],
		});
	});

	it('leaves malformed typed-array entries in place for schema validation to reject', () => {
		const config = {
			...baseConfig,
			integrations: [null, { credentialId: 'cred-slack' }, { type: 123 }],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
		expect(AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(config)).success).toBe(false);
	});

	it('does not mutate the input object', () => {
		const config = {
			...baseConfig,
			integrations: [{ type: 'schedule', cronExpression: '0 9 * * *' }],
		};
		const originalIntegrations = config.integrations;

		sanitizeAgentJsonConfig(config);

		expect(config.integrations).toBe(originalIntegrations);
		expect(config.integrations).toHaveLength(1);
	});

	it('preserves empty typed arrays', () => {
		const config = {
			...baseConfig,
			integrations: [],
			tools: [],
			skills: [],
			tasks: [],
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
	});

	it('preserves schema-known fields such as subAgents.maxChildren', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing questions.' }],
			},
		});
		const parsed = AgentJsonConfigSchema.safeParse(sanitized);

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.subAgents?.maxChildren).toBe(3);
		expect(parsed.data.subAgents?.agents?.[0]?.useWhen).toBe('Use for billing questions.');
	});

	it.each(['', '   ', 'Too short'])('accepts optional sub-agent useWhen value %p', (useWhen) => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				agents: [{ agentId: 'agent-2', useWhen }],
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				agents: [{ agentId: 'agent-2', useWhen }],
			},
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('rejects sub-agent useWhen values over 512 characters', () => {
		expect(
			AgentJsonConfigSchema.safeParse({
				...baseConfig,
				subAgents: {
					agents: [{ agentId: 'agent-2', useWhen: 'a'.repeat(513) }],
				},
			}).success,
		).toBe(false);
	});

	it.each([SUB_AGENT_MAX_CHILDREN_MIN, SUB_AGENT_MAX_CHILDREN_MAX])(
		'accepts boundary subAgents.maxChildren %s',
		(maxChildren) => {
			expect(
				AgentJsonConfigSchema.safeParse({
					...baseConfig,
					subAgents: { maxChildren },
				}).success,
			).toBe(true);
		},
	);

	it.each([0, -1, 1.5, SUB_AGENT_MAX_CHILDREN_MAX + 1])(
		'rejects invalid subAgents.maxChildren %s',
		(maxChildren) => {
			expect(
				AgentJsonConfigSchema.safeParse({
					...baseConfig,
					subAgents: { maxChildren },
				}).success,
			).toBe(false);
		},
	);

	it('preserves sub-agent model mappings by difficulty', () => {
		const config = {
			...baseConfig,
			subAgents: {
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'cred-openai' },
					medium: { model: 'anthropic/claude-haiku-4-5', credential: 'cred-anthropic' },
					high: {
						model: 'openrouter/anthropic/claude-sonnet-4-5',
						credential: 'cred-openrouter',
					},
				},
			},
		};

		expect(sanitizeAgentJsonConfig(config)).toEqual(config);
		expect(AgentJsonConfigSchema.safeParse(config).success).toBe(true);
	});

	it('strips unknown sub-agent difficulty model keys', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'cred-openai' },
					extreme: { model: 'anthropic/claude-sonnet-4-5', credential: 'cred-anthropic' },
				},
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'cred-openai' },
				},
			},
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('strips unknown fields from sub-agent difficulty model mappings', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: {
						model: 'openai/gpt-4o-mini',
						credential: 'cred-openai',
						label: 'Cheap model',
						provider: 'openai',
					},
				},
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'cred-openai' },
				},
			},
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});

	it('keeps invalid sub-agent difficulty model values for validation errors', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: {
						model: 'gpt-4o-mini',
						credential: 'cred-openai',
					},
				},
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: {
						model: 'gpt-4o-mini',
						credential: 'cred-openai',
					},
				},
			},
		});

		const result = AgentJsonConfigSchema.safeParse(sanitized);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			result.error.issues.some(
				(issue) => issue.path.join('.') === 'subAgents.modelsByDifficulty.low.model',
			),
		).toBe(true);
	});

	it('allows cleared sub-agent difficulty model credentials in draft config', () => {
		const result = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: {
				modelsByDifficulty: {
					low: {
						model: 'openai/gpt-4o-mini',
						credential: '   ',
					},
				},
			},
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.subAgents?.modelsByDifficulty?.low?.credential).toBe('');
	});

	it('preserves existing sub-agent refs and maxChildren with model mappings', () => {
		const sanitized = sanitizeAgentJsonConfig({
			...baseConfig,
			subAgents: {
				maxChildren: 4,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for support escalation.' }],
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'cred-anthropic' },
				},
			},
		});

		expect(sanitized).toEqual({
			...baseConfig,
			subAgents: {
				maxChildren: 4,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for support escalation.' }],
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'cred-anthropic' },
				},
			},
		});
		expect(AgentJsonConfigSchema.safeParse(sanitized).success).toBe(true);
	});
});
