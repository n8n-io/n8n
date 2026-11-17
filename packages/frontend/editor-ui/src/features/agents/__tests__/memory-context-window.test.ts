import { describe, expect, it } from 'vitest';

import type { ProviderCatalog } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';
import { getMemoryWindowWarnings } from '../utils/memory-context-window';

const catalog: ProviderCatalog = {
	openai: {
		id: 'openai',
		name: 'OpenAI',
		models: Object.fromEntries(
			[1_000_000, 128_000, 64_000, 32_000].map((context) => [
				String(context),
				{ id: String(context), name: String(context), toolCall: true, limits: { context } },
			]),
		),
	},
};

type ObservationConfig = NonNullable<NonNullable<AgentJsonConfig['memory']>['observationalMemory']>;
function config(memory: ObservationConfig = {}): AgentJsonConfig {
	return {
		name: 'Example',
		instructions: 'Help with questions.',
		model: 'openai/1000000',
		memory: {
			enabled: true,
			storage: 'n8n',
			observationalMemory: {
				observerModel: { model: 'openai/128000', credential: 'example' },
				reflectorModel: { model: 'openai/128000', credential: 'example' },
				...memory,
			},
		},
	};
}

describe('memory context window compatibility', () => {
	it('compares the nominal 60% batch rather than the full memory cap', () => {
		expect(
			getMemoryWindowWarnings(
				config({ windowShares: { maxContextWindowTokens: 160_000 } }),
				catalog,
			),
		).toEqual([]);
	});

	it.each([500_000, 0])('warns independently for both workers with cap %s', (cap) => {
		const tokens = (cap || 1_000_000) * 0.6;
		expect(
			getMemoryWindowWarnings(config({ windowShares: { maxContextWindowTokens: cap } }), catalog),
		).toEqual([
			{ role: 'observer', reason: 'exceeds', tokens, context: 128_000 },
			{ role: 'reflector', reason: 'exceeds', tokens, context: 128_000 },
		]);
	});

	it('respects the smaller conversation model window', () => {
		const agent = {
			...config({ windowShares: { maxContextWindowTokens: 500_000 } }),
			model: 'openai/64000',
		};
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([]);
	});

	it('checks an explicit reflector model and threshold separately', () => {
		const agent = config({
			windowShares: { maxContextWindowTokens: 160_000 },
			reflectorThresholdTokens: 150_000,
			reflectorModel: { model: 'openai/32000', credential: 'example' },
		});
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([
			{ role: 'reflector', reason: 'exceeds', tokens: 150_000, context: 32_000 },
		]);
	});

	it('reserves headroom when an estimate equals the model window', () => {
		expect(getMemoryWindowWarnings(config({ reflectorThresholdTokens: 128_000 }), catalog)).toEqual(
			[{ role: 'reflector', reason: 'exceeds', tokens: 128_000, context: 128_000 }],
		);
	});

	it('uses the automatic 200k cap when no fixed threshold is configured', () => {
		expect(getMemoryWindowWarnings(config(), catalog)).toEqual([]);
	});

	it('does not apply the automatic cap in fixed-threshold mode', () => {
		expect(getMemoryWindowWarnings(config({ observerThresholdTokens: 50_000 }), catalog)).toEqual([
			{ role: 'observer', reason: 'exceeds', tokens: 600_000, context: 128_000 },
		]);
	});

	it('uses window shares when a cap and fixed observer threshold are both set', () => {
		expect(
			getMemoryWindowWarnings(
				config({
					observerThresholdTokens: 50_000,
					windowShares: { maxContextWindowTokens: 160_000 },
				}),
				catalog,
			),
		).toEqual([]);
	});

	it('uses the conversation model as the independent fallback for each worker', () => {
		const agent = config({
			observerModel: undefined,
			reflectorModel: undefined,
			windowShares: { maxContextWindowTokens: 500_000 },
		});
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([]);
	});

	it('reports missing catalog limits without claiming compatibility', () => {
		expect(getMemoryWindowWarnings(config(), {})).toEqual([
			{ role: 'observer', reason: 'unknown' },
			{ role: 'reflector', reason: 'unknown' },
		]);
	});

	it('checks inherited memory against delegated difficulty models', () => {
		const agent = {
			...config({ windowShares: { maxContextWindowTokens: 500_000 } }),
			model: 'openai/128000',
			subAgents: {
				modelsByDifficulty: { high: { model: 'openai/1000000', credential: 'example' } },
			},
		};
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([
			{ role: 'observer', reason: 'exceeds', tokens: 300_000, context: 128_000 },
			{ role: 'reflector', reason: 'exceeds', tokens: 300_000, context: 128_000 },
		]);
		const memory = {
			...agent.memory!,
			observationalMemory: { windowShares: { maxContextWindowTokens: 500_000 } },
		};
		expect(getMemoryWindowWarnings({ ...agent, memory }, catalog)).toEqual([]);
	});

	it('retains known excessive estimates when another delegated model is unknown', () => {
		const agent = {
			...config({ windowShares: { maxContextWindowTokens: 0 } }),
			subAgents: {
				modelsByDifficulty: { high: { model: 'openai/custom', credential: 'example' } },
			},
		};
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([
			{ role: 'observer', reason: 'exceeds', tokens: 600_000, context: 128_000 },
			{ role: 'reflector', reason: 'exceeds', tokens: 600_000, context: 128_000 },
		]);
	});

	it('reports an unbounded batch when the main model window is unknown', () => {
		const agent = {
			...config({ windowShares: { maxContextWindowTokens: 0 } }),
			model: 'openai/custom',
		};
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([
			{ role: 'observer', reason: 'unknown' },
		]);
	});

	it('checks the fixed reflection fallback when the main model window is unknown', () => {
		const agent = {
			...config({
				windowShares: { maxContextWindowTokens: 0 },
				reflectorModel: { model: 'openai/32000', credential: 'example' },
			}),
			model: 'openai/custom',
		};
		expect(getMemoryWindowWarnings(agent, catalog)).toEqual([
			{ role: 'observer', reason: 'unknown' },
			{ role: 'reflector', reason: 'exceeds', tokens: 60_000, context: 32_000 },
		]);
	});

	it.each([
		undefined,
		{ enabled: false, storage: 'n8n' as const },
		{ enabled: true, storage: 'n8n' as const, observationalMemory: { enabled: false } },
	])('does not warn when memory is disabled: %j', (memory) => {
		expect(getMemoryWindowWarnings({ ...config(), memory }, catalog)).toEqual([]);
	});
});
