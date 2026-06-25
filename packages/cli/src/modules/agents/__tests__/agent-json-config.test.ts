import { AgentJsonConfigSchema, type AgentJsonConfig } from '@n8n/api-types';

const baseConfig: AgentJsonConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('AgentJsonConfigSchema — skill refs', () => {
	it('accepts a skill ref with a valid id', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		});

		expect(parsed.success).toBe(true);
	});

	it('rejects a skill ref with an invalid id', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			skills: [{ type: 'skill', id: 'summarize notes' }],
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects skill refs inside tools', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [{ type: 'skill', id: 'summarize_notes' }],
		});

		expect(parsed.success).toBe(false);
	});
});

describe('AgentJsonConfigSchema — subAgents', () => {
	it('accepts legacy saved agent references without useWhen routing guidance', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: { agents: [{ agentId: 'agent-1' }] },
		});
		expect(parsed.success).toBe(true);
	});

	it('accepts saved agent references with useWhen routing guidance', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: {
				agents: [
					{
						agentId: 'agent-1',
						useWhen: 'Use for billing-policy questions and invoice investigations.',
					},
				],
			},
		});

		expect(parsed.success).toBe(true);
	});

	it.each(['', '   ', 'Too short'])('accepts optional useWhen value %p', (useWhen) => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: { agents: [{ agentId: 'agent-1', useWhen }] },
		});

		expect(parsed.success).toBe(true);
	});

	it('rejects useWhen values over 512 characters', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: { agents: [{ agentId: 'agent-1', useWhen: 'a'.repeat(513) }] },
		});

		expect(parsed.success).toBe(false);
	});

	it('accepts an empty saved-agent reference list', () => {
		expect(
			AgentJsonConfigSchema.safeParse({ ...baseConfig, subAgents: { agents: [] } }).success,
		).toBe(true);
	});
});

describe('AgentJsonConfigSchema — memory.observationalMemory', () => {
	const memoryBase = { enabled: true, storage: 'n8n' as const };

	it('accepts a memory config without observationalMemory', () => {
		const parsed = AgentJsonConfigSchema.safeParse({ ...baseConfig, memory: memoryBase });
		expect(parsed.success).toBe(true);
	});

	it('rejects unsupported memory storage presets', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: { enabled: true, storage: 'sqlite' },
		});
		expect(parsed.success).toBe(false);
	});

	it('accepts observationalMemory: { enabled: true } alone', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: { ...memoryBase, observationalMemory: { enabled: true } },
		});
		expect(parsed.success).toBe(true);
	});

	it('accepts observationalMemory with observation-log thresholds set', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					enabled: true,
					observerThresholdTokens: 8_000,
					reflectorThresholdTokens: 24_000,
					renderTokenBudget: 8_000,
					observationLogTailLimit: 20,
					lockTtlMs: 30_000,
				},
			},
		});
		expect(parsed.success).toBe(true);
	});

	it('preserves observational memory task models', () => {
		const parsed = AgentJsonConfigSchema.parse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: 'openai-key' },
					reflectorModel: {
						model: 'anthropic/claude-sonnet-4-5',
						credential: 'anthropic-key',
					},
				},
			},
		});

		expect(parsed.memory?.observationalMemory).toMatchObject({
			observerModel: { model: 'openai/gpt-4o-mini', credential: 'openai-key' },
			reflectorModel: {
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'anthropic-key',
			},
		});
	});

	it('rejects bare string observational memory task models', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { observerModel: 'openai/gpt-4o-mini' },
			},
		});

		expect(parsed.success).toBe(false);
	});

	it('accepts cleared observational memory task model credentials', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: '' },
				},
			},
		});

		expect(parsed.success).toBe(true);
	});

	it('accepts whitespace-only observational memory task model credentials after trim', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: '   ' },
				},
			},
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		expect(parsed.data.memory?.observationalMemory?.observerModel).toEqual({
			model: 'openai/gpt-4o-mini',
			credential: '',
		});
	});

	it('rejects observer thresholds below one', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, observerThresholdTokens: 0 },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects reflector thresholds below one', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, reflectorThresholdTokens: 0 },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects render token budgets below one', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, renderTokenBudget: 0 },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('accepts observationalMemory without enabled because the writer defaults on', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { observationLogTailLimit: 20 },
			},
		});
		expect(parsed.success).toBe(true);
	});
});

describe('AgentJsonConfigSchema — memory.episodicMemory', () => {
	const memoryBase = { enabled: true, storage: 'n8n' as const };

	it('preserves episodic memory task models', () => {
		const parsed = AgentJsonConfigSchema.parse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: {
					enabled: true,
					credential: 'credential-id',
					extractorModel: { model: 'openai/gpt-4o-mini', credential: 'openai-key' },
					reflectorModel: {
						model: 'anthropic/claude-sonnet-4-5',
						credential: 'anthropic-key',
					},
				},
			},
		});

		expect(parsed.memory?.episodicMemory).toMatchObject({
			extractorModel: { model: 'openai/gpt-4o-mini', credential: 'openai-key' },
			reflectorModel: {
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'anthropic-key',
			},
		});
	});

	it('rejects bare string episodic memory task models', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: {
					enabled: true,
					credential: 'credential-id',
					extractorModel: 'openai/gpt-4o-mini',
				},
			},
		});

		expect(parsed.success).toBe(false);
	});

	it('accepts cleared episodic memory credentials', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: { enabled: true, credential: '' },
			},
		});

		expect(parsed.success).toBe(true);
	});

	it('accepts whitespace-only episodic memory credentials after trim', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: { enabled: true, credential: '   ' },
			},
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		const episodicMemory = parsed.data.memory?.episodicMemory;
		expect(episodicMemory).toMatchObject({ enabled: true, credential: '' });
	});

	it('accepts cleared episodic memory task model credentials', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: {
					enabled: true,
					credential: 'credential-id',
					extractorModel: { model: 'openai/gpt-4o-mini', credential: '' },
				},
			},
		});

		expect(parsed.success).toBe(true);
	});

	it('accepts whitespace-only episodic memory task model credentials after trim', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: {
					enabled: true,
					credential: 'credential-id',
					extractorModel: { model: 'openai/gpt-4o-mini', credential: '   ' },
				},
			},
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) return;

		const episodicMemory = parsed.data.memory?.episodicMemory;
		expect(episodicMemory).toMatchObject({
			extractorModel: { model: 'openai/gpt-4o-mini', credential: '' },
		});
	});
});
