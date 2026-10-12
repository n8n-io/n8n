import type { StatisticsIncrement, UsageFact, UsagePeriodIncrement } from '@n8n/db';

import { isRootFact, statisticsNameOf } from './usage-units';

export function startOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfUtcHour(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()),
	);
}

/** Count facts per project, phase, raw dimensions and UTC hour. Facts without a project are skipped. */
export function periodIncrementsOf(facts: UsageFact[]): UsagePeriodIncrement[] {
	const totals = new Map<string, UsagePeriodIncrement>();

	for (const fact of facts) {
		if (!fact.projectId) continue;
		const row: UsagePeriodIncrement = {
			projectId: fact.projectId,
			kind: fact.kind,
			subjectId: fact.subjectId,
			phase: fact.phase,
			trigger: fact.trigger,
			status: fact.status,
			origin: fact.origin ?? '',
			isTest: fact.isTest,
			hasParent: fact.parentId !== null,
			periodUnit: 'hour',
			periodStart: startOfUtcHour(fact.occurredAt),
			count: 1,
		};
		const key = [
			row.projectId,
			row.kind,
			row.subjectId,
			row.phase,
			row.trigger,
			row.status,
			row.origin,
			row.isTest,
			row.hasParent,
			row.periodUnit,
			row.periodStart.getTime(),
		].join('|');

		const total = totals.get(key);
		if (total) total.count++;
		else totals.set(key, row);
	}

	return [...totals.values()];
}

/** Sum finished workflow facts into `workflow_statistics` increments, as the legacy writers did. */
export function statisticsIncrementsOf(facts: UsageFact[]): StatisticsIncrement[] {
	const totals = new Map<string, StatisticsIncrement & { nameAt: number }>();

	for (const fact of facts) {
		if (fact.phase !== 'finished') continue;
		const name = statisticsNameOf(fact);
		if (!name) continue;
		const isRoot = isRootFact(fact);

		const key = `${fact.subjectId}|${name}`;
		const endedMs = fact.occurredAt.getTime();
		const firstEventMs = (fact.startedAt ?? fact.occurredAt).getTime();
		const total = totals.get(key);

		if (!total) {
			totals.set(key, {
				workflowId: fact.subjectId,
				name,
				count: 1,
				rootCount: isRoot ? 1 : 0,
				latestEvent: fact.occurredAt,
				workflowName: fact.subjectName,
				firstEventMs,
				nameAt: fact.subjectName ? endedMs : Number.NEGATIVE_INFINITY,
			});
			continue;
		}

		total.count++;
		if (isRoot) total.rootCount++;
		if (endedMs > total.latestEvent.getTime()) total.latestEvent = fact.occurredAt;
		total.firstEventMs = Math.min(total.firstEventMs, firstEventMs);
		// The newest non-null name wins, as in the legacy fold.
		if (fact.subjectName && endedMs >= total.nameAt) {
			total.workflowName = fact.subjectName;
			total.nameAt = endedMs;
		}
	}

	return [...totals.values()].map(({ nameAt: _, ...increment }) => increment);
}
