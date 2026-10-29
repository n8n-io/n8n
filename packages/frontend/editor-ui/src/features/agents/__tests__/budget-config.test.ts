import { describe, expect, it } from 'vitest';

import type { AgentJsonConfig } from '../types';
import { increasedBudgetConfig, raisedBudgetCaps } from '../utils/budget-config';

function configWithBudget(budget?: {
	monthlyBudgetUsd?: number;
	sessionCostCapUsd?: number;
}): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		config: {
			guardrails: {
				budget: budget ? { enabled: true, ...budget } : { enabled: false },
			},
		},
	};
}

describe('increasedBudgetConfig', () => {
	it('raises the stopped cap and keeps the other saved amounts', () => {
		const update = increasedBudgetConfig(
			configWithBudget({ monthlyBudgetUsd: 200, sessionCostCapUsd: 5 }),
			'sessionCostCapUsd',
			10,
		);

		expect(update?.config?.guardrails?.budget).toEqual({
			enabled: true,
			monthlyBudgetUsd: 200,
			sessionCostCapUsd: 10,
		});
	});

	it('accepts any positive amount when no cap exists yet', () => {
		const update = increasedBudgetConfig(configWithBudget(), 'sessionCostCapUsd', 1);

		expect(update?.config?.guardrails?.budget?.sessionCostCapUsd).toBe(1);
	});

	it('rejects an amount equal to the current cap', () => {
		expect(
			increasedBudgetConfig(configWithBudget({ sessionCostCapUsd: 5 }), 'sessionCostCapUsd', 5),
		).toBeUndefined();
	});

	it('rejects an amount below the current cap', () => {
		expect(
			increasedBudgetConfig(configWithBudget({ sessionCostCapUsd: 5 }), 'sessionCostCapUsd', 1),
		).toBeUndefined();
	});

	it('rejects empty and negative amounts', () => {
		const config = configWithBudget({ sessionCostCapUsd: 5 });

		expect(increasedBudgetConfig(config, 'sessionCostCapUsd', 0)).toBeUndefined();
		expect(increasedBudgetConfig(config, 'sessionCostCapUsd', -3)).toBeUndefined();
		expect(increasedBudgetConfig(config, 'sessionCostCapUsd', Number.NaN)).toBeUndefined();
	});
});

describe('raisedBudgetCaps', () => {
	it('reports a raised cap', () => {
		expect(
			raisedBudgetCaps(
				{ enabled: true, sessionCostCapUsd: 5 },
				{ enabled: true, sessionCostCapUsd: 10 },
			),
		).toEqual(['sessionCostCapUsd']);
	});

	it('reports a removed cap', () => {
		expect(raisedBudgetCaps({ enabled: true, monthlyBudgetUsd: 200 }, { enabled: false })).toEqual([
			'monthlyBudgetUsd',
		]);
	});

	it('does not report a lowered or unchanged cap', () => {
		expect(
			raisedBudgetCaps(
				{ enabled: true, monthlyBudgetUsd: 200, sessionCostCapUsd: 5 },
				{ enabled: true, monthlyBudgetUsd: 100, sessionCostCapUsd: 5 },
			),
		).toEqual([]);
	});

	it('does not report a newly added cap', () => {
		expect(raisedBudgetCaps({ enabled: false }, { enabled: true, sessionCostCapUsd: 5 })).toEqual(
			[],
		);
	});
});
