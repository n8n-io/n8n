import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { windowStart } from './budget-window';
import { LlmBudgetSpendService } from './llm-budget-spend.service';
// Also adds the budget events to `EventService`.
import type { LlmBudgetEventMap } from './llm-budget.events';

/** A rolling threshold fires again only after the spend drops this many points below it. */
const REARM_MARGIN_PERCENT = 10;

/**
 * Emits an event when a budget counter crosses a warning threshold, and when a `warn` budget
 * reaches its limit. Only the leader main emits, so each crossing is sent once. The sent
 * events are kept in memory, so a restart or a leader change can send one again (POC).
 * **Direction:** keep them in a table.
 */
@Service()
export class LlmBudgetWarnings {
	/** Sent events by budget, counter and threshold. The value is the calendar window start. */
	private readonly sent = new Map<string, number>();

	constructor(
		private readonly spend: LlmBudgetSpendService,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	start() {
		this.spend.onRefresh(() => this.emitCrossings(new Date()));
	}

	emitCrossings(now: Date) {
		if (!this.instanceSettings.isLeader) return;
		for (const budget of this.spend.enabledBudgets) {
			const { timeWindow } = budget;
			// A calendar threshold fires again in the next window. A rolling one has no next window.
			const window =
				timeWindow.kind === 'calendar'
					? windowStart(timeWindow, now, this.globalConfig.generic.timezone).getTime()
					: 0;
			const thresholds: Array<{ percent: number; event: keyof LlmBudgetEventMap }> =
				budget.warnAtPercent.map((percent) => ({ percent, event: 'llm-budget-threshold-reached' }));
			if (budget.action === 'warn') {
				thresholds.push({ percent: 100, event: 'llm-budget-limit-reached' });
			}

			for (const counter of this.spend.countersOf(budget.id)) {
				const percent = (counter.costUsd / budget.limitAmount) * 100;
				for (const threshold of thresholds) {
					const id = `${budget.id}|${counter.key}|${threshold.event}|${threshold.percent}`;
					if (percent < threshold.percent) {
						if (percent < threshold.percent - REARM_MARGIN_PERCENT) this.sent.delete(id);
						continue;
					}
					if (this.sent.get(id) === window) continue;
					this.sent.set(id, window);
					this.eventService.emit(threshold.event, {
						budgetId: budget.id,
						budgetName: budget.name,
						counterKey: counter.key,
						thresholdPercent: threshold.percent,
						percent,
						spentUsd: counter.costUsd,
						limitUsd: budget.limitAmount,
					});
				}
			}
		}
	}
}
