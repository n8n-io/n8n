import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import {
	BUDGETED_CALLERS,
	counterKey,
	rowValues,
	spendDimensions,
	type CallValues,
} from './budget-target';
import { windowStart } from './budget-window';
import type { LlmBudget } from './llm-budget.entity';
import { LlmBudgetRepository } from './llm-budget.repository';
import type { LlmUsage } from './llm-usage.entity';
import { LlmUsageRepository } from './llm-usage.repository';

/**
 * How often each process reads the budgets and their spend again. It picks up the calls of the
 * other processes and budget writes on other mains. **Direction:** a pubsub reload command.
 */
const REFRESH_INTERVAL_MS = 30 * Time.seconds.toMilliseconds;
/** Above this, a budget keeps no more counters, so a budget on many users cannot grow memory. */
const MAX_COUNTERS = 10_000;

export interface LlmBudgetCounter {
	key: string;
	values: CallValues;
	costUsd: number;
	unpriced: number;
}

/**
 * The spend of every enabled budget, in memory, so a call is checked without I/O. A refresh
 * replaces the counters with the database totals. Between refreshes, this process adds its own
 * calls as it records them. Calls can go above a limit by the refresh lag (spec D4).
 */
@Service()
export class LlmBudgetSpendService {
	private budgets: LlmBudget[] = [];

	private counters = new Map<string, Map<string, LlmBudgetCounter>>();

	private loaded = false;

	private timer: NodeJS.Timeout | undefined;

	private readonly refreshListeners: Array<() => void> = [];

	constructor(
		private readonly budgetRepository: LlmBudgetRepository,
		private readonly usageRepository: LlmUsageRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('llm-usage');
	}

	start() {
		this.timer = setInterval(async () => await this.refresh(), REFRESH_INTERVAL_MS);
		this.timer.unref();
		void this.refresh();
	}

	stop() {
		clearInterval(this.timer);
	}

	/** False until the first refresh succeeds. Until then a check cannot decide. */
	get ready() {
		return this.loaded;
	}

	get enabledBudgets(): readonly LlmBudget[] {
		return this.budgets;
	}

	/** Runs after each successful refresh, for example to emit warnings. */
	onRefresh(listener: () => void) {
		this.refreshListeners.push(listener);
	}

	spent(budgetId: string, key: string) {
		return this.counters.get(budgetId)?.get(key)?.costUsd ?? 0;
	}

	countersOf(budgetId: string): LlmBudgetCounter[] {
		return [...(this.counters.get(budgetId)?.values() ?? [])];
	}

	/** Adds a recorded call of this process, before the next refresh reads it from the database. */
	add(row: Partial<LlmUsage>) {
		if (!row.callerType || !BUDGETED_CALLERS.includes(row.callerType)) return;
		const values = rowValues(row);
		for (const budget of this.budgets) {
			const key = counterKey(budget, values);
			if (key === undefined) continue;
			const counter = this.counter(budget.id, key, values);
			if (!counter) continue;
			if (row.priced) counter.costUsd += row.estimatedCostUsd ?? 0;
			else counter.unpriced += 1;
		}
	}

	/** Reads the enabled budgets and their spend. On an error, keeps the last counters. */
	async refresh() {
		try {
			const budgets = await this.budgetRepository.listEnabled();
			const now = new Date();
			const counters = new Map<string, Map<string, LlmBudgetCounter>>();
			for (const budget of budgets) {
				const rows = await this.usageRepository.spendByKey({
					from: windowStart(budget.timeWindow, now, this.globalConfig.generic.timezone),
					dimensions: spendDimensions(budget),
					callerTypes: BUDGETED_CALLERS,
				});
				const byKey = new Map<string, LlmBudgetCounter>();
				for (const { values, costUsd, unpriced } of rows.slice(0, MAX_COUNTERS)) {
					const key = counterKey(budget, values);
					if (key !== undefined) byKey.set(key, { key, values, costUsd, unpriced });
				}
				counters.set(budget.id, byKey);
			}
			this.budgets = budgets;
			this.counters = counters;
			this.loaded = true;
		} catch (error) {
			this.logger.warn('Could not refresh the LLM budget spend, keeping the last values', {
				error,
			});
			return;
		}
		for (const listener of this.refreshListeners) listener();
	}

	private counter(budgetId: string, key: string, values: CallValues) {
		const byKey = this.counters.get(budgetId) ?? new Map<string, LlmBudgetCounter>();
		this.counters.set(budgetId, byKey);
		const existing = byKey.get(key);
		if (existing) return existing;
		if (byKey.size >= MAX_COUNTERS) return undefined;
		const counter = { key, values, costUsd: 0, unpriced: 0 };
		byKey.set(key, counter);
		return counter;
	}
}
