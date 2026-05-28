import {
	AgentJsonConfigSchema,
	isNodeToolsEnabled,
	isSubAgentsEnabled,
	type AgentJsonConfig,
} from '@n8n/api-types';

const baseConfig: AgentJsonConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

describe('AgentJsonConfigSchema — config.nodeTools', () => {
	it('accepts a config without nodeTools', () => {
		expect(AgentJsonConfigSchema.safeParse({ ...baseConfig, config: {} }).success).toBe(true);
	});

	it('accepts nodeTools: { enabled: true }', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			config: { nodeTools: { enabled: true } },
		});
		expect(parsed.success).toBe(true);
	});

	it('accepts nodeTools: { enabled: false }', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			config: { nodeTools: { enabled: false } },
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects nodeTools without enabled', () => {
		expect(
			AgentJsonConfigSchema.safeParse({ ...baseConfig, config: { nodeTools: {} } }).success,
		).toBe(false);
	});

	it('rejects nodeTools.enabled of the wrong type', () => {
		expect(
			AgentJsonConfigSchema.safeParse({
				...baseConfig,
				config: { nodeTools: { enabled: 'yes' } },
			}).success,
		).toBe(false);
	});
});

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

describe('isNodeToolsEnabled', () => {
	it('returns false when config is undefined', () => {
		expect(isNodeToolsEnabled(undefined)).toBe(false);
	});

	it('returns false when config has no nodeTools field', () => {
		expect(isNodeToolsEnabled({})).toBe(false);
	});

	it('returns false when nodeTools.enabled is false', () => {
		expect(isNodeToolsEnabled({ nodeTools: { enabled: false } })).toBe(false);
	});

	it('returns true only when nodeTools.enabled is explicitly true', () => {
		expect(isNodeToolsEnabled({ nodeTools: { enabled: true } })).toBe(true);
	});
});

describe('AgentJsonConfigSchema — subAgents', () => {
	it('accepts subAgents: { enabled: true }', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			subAgents: { enabled: true },
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects subAgents without enabled', () => {
		expect(AgentJsonConfigSchema.safeParse({ ...baseConfig, subAgents: {} }).success).toBe(false);
	});
});

describe('isSubAgentsEnabled', () => {
	it('returns false when subAgents is undefined', () => {
		expect(isSubAgentsEnabled(undefined)).toBe(false);
	});

	it('returns true only when subAgents.enabled is explicitly true', () => {
		expect(isSubAgentsEnabled({ enabled: false })).toBe(false);
		expect(isSubAgentsEnabled({ enabled: true })).toBe(true);
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

	it('rejects observational memory task models with blank credentials', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					observerModel: { model: 'openai/gpt-4o-mini', credential: '   ' },
				},
			},
		});

		expect(parsed.success).toBe(false);
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

	it('rejects enabled episodic memory with a blank credential', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: { enabled: true, credential: '   ' },
			},
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects episodic memory task models with blank credentials', () => {
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

		expect(parsed.success).toBe(false);
	});
});
