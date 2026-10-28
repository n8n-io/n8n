import type { EventService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LlmBudgetCounter, LlmBudgetSpendService } from '../llm-budget-spend.service';
import type { LlmBudget } from '../llm-budget.entity';
import { LlmBudgetWarnings } from '../llm-budget-warnings';

const budget = (overrides: Partial<LlmBudget> = {}) =>
	({
		id: 'budget-1',
		name: 'Daily per user',
		timeWindow: { kind: 'rolling', unit: 'day' },
		limitAmount: 10,
		action: 'block',
		warnAtPercent: [80],
		...overrides,
	}) as LlmBudget;

describe('LlmBudgetWarnings', () => {
	const eventService = mock<EventService>();
	const globalConfig = mock<GlobalConfig>({ generic: { timezone: 'UTC' } });
	let costUsd: number;
	let budgets: LlmBudget[];

	const spend = {
		get enabledBudgets() {
			return budgets;
		},
		countersOf: (): LlmBudgetCounter[] => [
			{ key: 'user=u1', values: { user: 'u1' }, costUsd, unpriced: 0 },
		],
	} as unknown as LlmBudgetSpendService;

	const warnings = (isLeader = true) =>
		new LlmBudgetWarnings(spend, eventService, mock<InstanceSettings>({ isLeader }), globalConfig);

	const emitted = () => eventService.emit.mock.calls.map(([name]) => name);

	beforeEach(() => {
		eventService.emit.mockReset();
		budgets = [budget()];
		costUsd = 0;
	});

	it('emits a crossing once, and again for a rolling window after the spend drops well below', () => {
		const detector = warnings();
		const at = (cost: number) => {
			costUsd = cost;
			detector.emitCrossings(new Date('2026-10-27T12:00:00Z'));
		};

		at(8.5);
		at(9);
		at(7.5); // Within the margin: stays sent.
		at(8.5);
		at(6); // 10 points below: armed again.
		at(8.5);

		expect(emitted()).toEqual(['llm-budget-threshold-reached', 'llm-budget-threshold-reached']);
		expect(eventService.emit).toHaveBeenCalledWith('llm-budget-threshold-reached', {
			budgetId: 'budget-1',
			budgetName: 'Daily per user',
			counterKey: 'user=u1',
			thresholdPercent: 80,
			percent: 85,
			spentUsd: 8.5,
			limitUsd: 10,
		});
	});

	it('emits a calendar crossing again in the next window', () => {
		budgets = [budget({ timeWindow: { kind: 'calendar', unit: 'day', timezone: 'UTC' } })];
		costUsd = 9;
		const detector = warnings();

		detector.emitCrossings(new Date('2026-10-27T12:00:00Z'));
		detector.emitCrossings(new Date('2026-10-27T18:00:00Z'));
		detector.emitCrossings(new Date('2026-10-28T12:00:00Z'));

		expect(emitted()).toHaveLength(2);
	});

	it('emits the limit of a warn budget, which does not block', () => {
		budgets = [budget({ action: 'warn', warnAtPercent: [] })];
		costUsd = 10;

		warnings().emitCrossings(new Date());

		expect(emitted()).toEqual(['llm-budget-limit-reached']);
	});

	it('leaves the events to the leader', () => {
		costUsd = 9;

		warnings(false).emitCrossings(new Date());

		expect(eventService.emit).not.toHaveBeenCalled();
	});
});
