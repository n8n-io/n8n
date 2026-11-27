import { agentConfigOverrideError, applyAgentConfigOverrides } from '../agent-config-overrides';
import type { AgentJsonConfig } from '../agent-json-config.schema';

const observerModel = { model: 'anthropic/claude-haiku-5-5', credential: 'cred-1' };
const episodicMemory = { enabled: true as const, credential: 'cred-2', topK: 5 };
const memory: NonNullable<AgentJsonConfig['memory']> = {
	enabled: true,
	storage: 'n8n',
	observationalMemory: { enabled: true, observerModel },
	episodicMemory,
};

const seeded: AgentJsonConfig = {
	name: 'Support agent',
	model: 'anthropic/claude-sonnet-5-5',
	credential: 'cred-1',
	instructions: 'Help the user.',
	memory,
};

describe('applyAgentConfigOverrides', () => {
	it('returns the config unchanged without overrides', () => {
		expect(applyAgentConfigOverrides(seeded, undefined)).toEqual({
			success: true,
			config: seeded,
		});
	});

	it('deep-merges nested objects and keeps the keys the override does not name', () => {
		const result = applyAgentConfigOverrides(seeded, {
			memory: { observationalMemory: { observerThresholdTokens: 2000 } },
		});

		expect(result).toMatchObject({
			success: true,
			config: {
				instructions: 'Help the user.',
				memory: {
					enabled: true,
					observationalMemory: {
						enabled: true,
						observerModel,
						observerThresholdTokens: 2000,
					},
					episodicMemory,
				},
			},
		});
	});

	it('replaces arrays and scalars instead of merging them', () => {
		const result = applyAgentConfigOverrides(
			{
				...seeded,
				memory: {
					...memory,
					episodicMemory: { ...episodicMemory, guidance: { include: ['a', 'b'] } },
				},
			},
			{ memory: { episodicMemory: { guidance: { include: ['c'] } } } },
		);

		expect(result.success && result.config.memory?.episodicMemory).toMatchObject({
			guidance: { include: ['c'] },
		});
	});

	it('turns episodic memory off for a variant', () => {
		const result = applyAgentConfigOverrides(seeded, {
			memory: { episodicMemory: { enabled: false } },
		});

		expect(result.success && result.config.memory?.episodicMemory).toEqual({ enabled: false });
	});

	it('rejects an override that makes the config invalid', () => {
		const result = applyAgentConfigOverrides(seeded, {
			memory: { observationalMemory: { observerThresholdTokens: -5 } },
		});

		expect(result.success).toBe(false);
		expect(!result.success && result.error).toContain(
			'memory.observationalMemory.observerThresholdTokens',
		);
	});

	it('rejects a key the Agent config does not have', () => {
		const result = applyAgentConfigOverrides(seeded, {
			memory: { observationalMemory: { observerThresholdToken: 2000 } },
		});

		expect(result.success).toBe(false);
		expect(!result.success && result.error).toContain(
			'memory.observationalMemory.observerThresholdToken',
		);
	});
});

describe('agentConfigOverrideError', () => {
	it('is undefined when the merged config is valid', () => {
		expect(
			agentConfigOverrideError(seeded, { memory: { episodicMemory: { enabled: false } } }),
		).toBeUndefined();
	});

	it('names the field an invalid override breaks, for a config of unknown shape', () => {
		const raw: unknown = JSON.parse(JSON.stringify(seeded));

		expect(
			agentConfigOverrideError(raw, { memory: { observationalMemory: { lockTtlMs: -1 } } }),
		).toContain('memory.observationalMemory.lockTtlMs');
	});
});

describe('credentials in overrides', () => {
	it.each([
		['the model credential', { credential: 'cred-9' }, 'credential'],
		[
			'an episodic embedding credential',
			{ memory: { episodicMemory: { credential: 'cred-9' } } },
			'memory.episodicMemory.credential',
		],
		[
			'a worker model credential',
			{
				memory: {
					observationalMemory: {
						observerModel: { model: 'anthropic/claude-haiku-5-5', credential: 'cred-9' },
					},
				},
			},
			'memory.observationalMemory.observerModel.credential',
		],
	])('rejects %s, which the restore would not rebind', (_label, overrides, path) => {
		const result = applyAgentConfigOverrides(seeded, overrides);

		expect(result.success).toBe(false);
		expect(!result.success && result.error).toContain(path);
		expect(agentConfigOverrideError(seeded, overrides)).toContain(path);
	});
});
