import { AgentJsonConfigSchema, isNodeToolsEnabled } from '../json-config/agent-json-config';
import type { AgentJsonConfig } from '../json-config/agent-json-config';

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

	it('accepts observationalMemory with trigger and compaction cadence set', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: {
					enabled: true,
					trigger: { type: 'idle-timer', idleMs: 60_000, gapThresholdMs: 300_000 },
					compactionThreshold: 5,
					gapThresholdMs: 3_600_000,
					lockTtlMs: 30_000,
					sync: true,
					observerPrompt: 'Observe this.',
					compactorPrompt: 'Compact this.',
				},
			},
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects negative idle timer values', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, trigger: { type: 'idle-timer', idleMs: -1 } },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects a compaction threshold below one', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, compactionThreshold: 0 },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects a negative gap threshold', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { enabled: true, gapThresholdMs: -1 },
			},
		});
		expect(parsed.success).toBe(false);
	});

	it('accepts observationalMemory without enabled because the writer defaults on', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				observationalMemory: { trigger: { type: 'per-turn' } },
			},
		});
		expect(parsed.success).toBe(true);
	});
});

describe('AgentJsonConfigSchema — memory.episodicMemory', () => {
	const memoryBase = { enabled: true, storage: 'n8n' as const };
	const enabledEpisodicMemoryBase = {
		enabled: true,
		credential: 'openai-credential-id',
	} as const;

	it('accepts episodic memory entries with an embedding model and credential reference', () => {
		const parsed = AgentJsonConfigSchema.safeParse({
			...baseConfig,
			memory: {
				...memoryBase,
				episodicMemory: {
					...enabledEpisodicMemoryBase,
					embedder: 'openai/text-embedding-3-small',
					topK: 8,
					autoInject: false,
					autoInjectTopK: 4,
					maxEntriesPerTurn: 5,
					maxEntryLength: 2000,
					dedupeSimilarityThreshold: false,
					prompts: {
						extraction: 'Extract source-backed case entries.',
						recallToolInstruction: 'Use recall_memory when entries may help.',
						injection: 'Use these surfaced entries if relevant.',
					},
				},
			},
		});

		expect(parsed.success).toBe(true);
	});

	it('accepts the default embedding model path and disabled episodic memory without credentials', () => {
		for (const episodicMemory of [enabledEpisodicMemoryBase, { enabled: false }] satisfies Array<
			NonNullable<AgentJsonConfig['memory']>['episodicMemory']
		>) {
			const parsed = AgentJsonConfigSchema.safeParse({
				...baseConfig,
				memory: { ...memoryBase, episodicMemory },
			});

			expect(parsed.success).toBe(true);
		}
	});

	it('rejects legacy and invalid enabled episodic memory config', () => {
		const cases = [
			{
				...memoryBase,
				crossThreadFacts: { enabled: true, credential: 'openai-credential-id' },
			},
			{
				...memoryBase,
				episodicMemory: { ...enabledEpisodicMemoryBase, autoInjectTopK: 0 },
			},
			{
				...memoryBase,
				episodicMemory: {
					...enabledEpisodicMemoryBase,
					dedupeSimilarityThreshold: -0.1,
				},
			},
			{
				...memoryBase,
				episodicMemory: {
					...enabledEpisodicMemoryBase,
					dedupeSimilarityThreshold: 1.1,
				},
			},
			{
				...memoryBase,
				episodicMemory: { enabled: true, embedder: 'openai/text-embedding-3-small' },
			},
		];

		for (const memory of cases) {
			expect(AgentJsonConfigSchema.safeParse({ ...baseConfig, memory }).success).toBe(false);
		}
	});
});
