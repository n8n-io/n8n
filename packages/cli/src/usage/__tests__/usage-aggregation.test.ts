import { StatisticsNames, type UsageFact } from '@n8n/db';

import {
	periodIncrementsOf,
	startOfUtcHour,
	startOfUtcDay,
	statisticsIncrementsOf,
} from '../usage-aggregation';

function makeUsageFact(overrides: Partial<UsageFact> = {}): UsageFact {
	return {
		kind: 'workflow',
		executionId: 'exec-1',
		phase: 'finished',
		subjectId: 'workflow-1',
		subjectName: 'Test workflow',
		projectId: 'project-1',
		trigger: 'webhook',
		status: 'success',
		origin: null,
		isTest: false,
		parentId: null,
		startedAt: new Date('2026-10-12T10:00:00.000Z'),
		occurredAt: new Date('2026-10-12T10:00:01.000Z'),
		...overrides,
	};
}

describe('startOfUtcDay', () => {
	it('drops the time-of-day, keeping only the UTC calendar date', () => {
		const result = startOfUtcDay(new Date('2026-10-12T15:42:07.123Z'));
		expect(result.toISOString()).toBe('2026-10-12T00:00:00.000Z');
	});

	it('places a moment just before UTC midnight on the earlier calendar day', () => {
		const result = startOfUtcDay(new Date('2026-10-12T23:59:59.999Z'));
		expect(result.toISOString()).toBe('2026-10-12T00:00:00.000Z');
	});

	it('places a moment at UTC midnight on the next calendar day', () => {
		const result = startOfUtcDay(new Date('2026-10-13T00:00:00.000Z'));
		expect(result.toISOString()).toBe('2026-10-13T00:00:00.000Z');
	});

	it('places same-day timestamps on the same boundary', () => {
		const morning = startOfUtcDay(new Date('2026-10-12T01:00:00.000Z'));
		const evening = startOfUtcDay(new Date('2026-10-12T22:00:00.000Z'));
		expect(morning.toISOString()).toBe(evening.toISOString());
	});
});

describe('periodIncrementsOf', () => {
	it('groups facts sharing project, kind, subject and every grid dimension in the same UTC hour into one counted row', () => {
		const facts = [
			makeUsageFact({ trigger: 'integrated', occurredAt: new Date('2026-10-12T08:05:00.000Z') }),
			makeUsageFact({ trigger: 'integrated', occurredAt: new Date('2026-10-12T08:55:00.000Z') }),
		];

		const result = periodIncrementsOf(facts);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			projectId: 'project-1',
			kind: 'workflow',
			subjectId: 'workflow-1',
			trigger: 'integrated',
			status: 'success',
			origin: '',
			isTest: false,
			hasParent: false,
			periodUnit: 'hour',
			periodStart: new Date('2026-10-12T08:00:00.000Z'),
			count: 2,
		});
	});

	it('puts facts in different UTC hours of one day into separate hourly rows', () => {
		const rows = periodIncrementsOf([
			makeUsageFact({ occurredAt: new Date('2026-10-12T08:59:59.999Z') }),
			makeUsageFact({ occurredAt: new Date('2026-10-12T09:00:00.000Z') }),
		]);

		expect(rows.map((row) => row.periodStart.toISOString()).sort()).toEqual([
			'2026-10-12T08:00:00.000Z',
			'2026-10-12T09:00:00.000Z',
		]);
		expect(rows.every((row) => row.periodUnit === 'hour')).toBe(true);
	});

	it('skips a fact with no projectId', () => {
		expect(periodIncrementsOf([makeUsageFact({ projectId: null })])).toEqual([]);
	});

	it('puts facts on different UTC days into separate rows', () => {
		const facts = [
			makeUsageFact({ occurredAt: new Date('2026-10-12T23:59:59.999Z') }),
			makeUsageFact({ occurredAt: new Date('2026-10-13T00:00:00.000Z') }),
		];

		const result = periodIncrementsOf(facts);

		expect(result).toHaveLength(2);
		expect(result.every((row) => row.count === 1)).toBe(true);
	});

	it('splits rows that differ only by origin, isTest or hasParent', () => {
		const facts = [
			makeUsageFact({ origin: null }),
			makeUsageFact({ origin: 'instance_ai' }),
			makeUsageFact({ isTest: true }),
			makeUsageFact({ parentId: 'parent-exec-1' }),
		];

		const result = periodIncrementsOf(facts);

		expect(result).toHaveLength(4);
		expect(result.every((row) => row.count === 1)).toBe(true);
	});

	it('maps a null origin to an empty string and a parentId to hasParent', () => {
		const result = periodIncrementsOf([makeUsageFact({ origin: null, parentId: 'parent-exec-1' })]);

		expect(result[0]).toMatchObject({ origin: '', hasParent: true });
	});

	it('still produces a row for a chat-mode run, since filtering happens at read time', () => {
		const result = periodIncrementsOf([makeUsageFact({ trigger: 'chat' })]);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ trigger: 'chat', count: 1 });
	});

	it('still produces a row for a canceled run, since filtering happens at read time', () => {
		const result = periodIncrementsOf([makeUsageFact({ status: 'canceled' })]);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ status: 'canceled', count: 1 });
	});
});

describe('statisticsIncrementsOf', () => {
	it('ignores agent-kind facts', () => {
		const facts = [makeUsageFact({ kind: 'agent', trigger: 'chat_message' })];
		expect(statisticsIncrementsOf(facts)).toEqual([]);
	});

	it('ignores chat-mode facts', () => {
		expect(statisticsIncrementsOf([makeUsageFact({ trigger: 'chat' })])).toEqual([]);
	});

	it('ignores canceled-status facts', () => {
		expect(statisticsIncrementsOf([makeUsageFact({ status: 'canceled' })])).toEqual([]);
	});

	it('ignores waiting-status facts', () => {
		expect(statisticsIncrementsOf([makeUsageFact({ status: 'waiting' })])).toEqual([]);
	});

	it('sums count and rootCount per workflow and statistics name group', () => {
		const facts = [
			makeUsageFact({ trigger: 'webhook', status: 'success' }),
			makeUsageFact({ trigger: 'integrated', status: 'success' }),
		];

		const result = statisticsIncrementsOf(facts);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			name: StatisticsNames.productionSuccess,
			count: 2,
			rootCount: 1,
		});
	});

	it('does not count integrated mode toward rootCount', () => {
		const result = statisticsIncrementsOf([
			makeUsageFact({ trigger: 'integrated', status: 'success' }),
		]);
		expect(result[0]).toMatchObject({ count: 1, rootCount: 0 });
	});

	it('does not count error mode toward rootCount', () => {
		const result = statisticsIncrementsOf([makeUsageFact({ trigger: 'error', status: 'success' })]);
		expect(result[0]).toMatchObject({ count: 1, rootCount: 0 });
	});

	it('does not count an instance_ai origin toward rootCount, even in an otherwise root mode', () => {
		const result = statisticsIncrementsOf([
			makeUsageFact({ trigger: 'webhook', status: 'success', origin: 'instance_ai' }),
		]);
		expect(result[0]).toMatchObject({ count: 1, rootCount: 0 });
	});

	it('counts a root mode toward rootCount', () => {
		const result = statisticsIncrementsOf([
			makeUsageFact({ trigger: 'webhook', status: 'success' }),
		]);
		expect(result[0]).toMatchObject({ count: 1, rootCount: 1 });
	});

	it('keeps the max occurredAt in the group as latestEvent, regardless of fact order', () => {
		const facts = [
			makeUsageFact({ occurredAt: new Date('2026-10-12T08:00:00.000Z') }),
			makeUsageFact({ occurredAt: new Date('2026-10-14T08:00:00.000Z') }),
			makeUsageFact({ occurredAt: new Date('2026-10-13T08:00:00.000Z') }),
		];

		const result = statisticsIncrementsOf(facts);

		expect(result[0].latestEvent).toEqual(new Date('2026-10-14T08:00:00.000Z'));
	});

	it('uses the min of startedAt (falling back to occurredAt) across the group as firstEventMs', () => {
		const facts = [
			makeUsageFact({
				startedAt: new Date('2026-10-12T10:00:05.000Z'),
				occurredAt: new Date('2026-10-12T10:00:10.000Z'),
			}),
			makeUsageFact({
				startedAt: null,
				occurredAt: new Date('2026-10-12T10:00:02.000Z'),
			}),
		];

		const result = statisticsIncrementsOf(facts);

		expect(result[0].firstEventMs).toBe(new Date('2026-10-12T10:00:02.000Z').getTime());
	});

	it('resolves workflowName to the name of the most recently ended fact that has a name', () => {
		// Distinguishes "newest non-null wins" from "first non-null wins" and "last fact always wins".
		const facts = [
			makeUsageFact({
				subjectName: 'Name A (oldest, named)',
				occurredAt: new Date('2026-10-10T08:00:00.000Z'),
			}),
			makeUsageFact({
				subjectName: 'Name B (newest, named)',
				occurredAt: new Date('2026-10-12T08:00:00.000Z'),
			}),
			makeUsageFact({
				subjectName: null,
				occurredAt: new Date('2026-10-11T08:00:00.000Z'),
			}),
		];

		const result = statisticsIncrementsOf(facts);

		expect(result).toHaveLength(1);
		expect(result[0].workflowName).toBe('Name B (newest, named)');
	});

	it('does not let a later fact with no name erase a previously set name', () => {
		const facts = [
			makeUsageFact({
				subjectName: 'Name A (named)',
				occurredAt: new Date('2026-10-10T08:00:00.000Z'),
			}),
			makeUsageFact({
				subjectName: null,
				occurredAt: new Date('2026-10-12T08:00:00.000Z'),
			}),
		];

		const result = statisticsIncrementsOf(facts);

		expect(result[0].workflowName).toBe('Name A (named)');
	});
});

describe('phases', () => {
	it('keeps started and finished facts of one run in separate grid rows', () => {
		const rows = periodIncrementsOf([
			makeUsageFact({ phase: 'started', status: 'running' }),
			makeUsageFact({ phase: 'finished' }),
		]);

		expect(rows.map((row) => row.phase).sort()).toEqual(['finished', 'started']);
	});

	it('adds only finished facts to the workflow_statistics increments', () => {
		const increments = statisticsIncrementsOf([
			makeUsageFact({ phase: 'started', status: 'success' }),
			makeUsageFact({ phase: 'refused', status: 'success' }),
			makeUsageFact({ phase: 'finished', status: 'success' }),
		]);

		expect(increments).toHaveLength(1);
		expect(increments[0].count).toBe(1);
	});
});

describe('startOfUtcHour', () => {
	it('drops minutes, seconds and milliseconds in UTC', () => {
		expect(startOfUtcHour(new Date('2026-10-12T23:59:59.999Z')).toISOString()).toBe(
			'2026-10-12T23:00:00.000Z',
		);
	});
});
