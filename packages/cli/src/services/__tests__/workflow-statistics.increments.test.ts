import { StatisticsNames, type ExecutionLedgerRow } from '@n8n/db';

import { toStatisticsIncrements } from '../workflow-statistics.increments';

let nextId = 0;

function row(overrides: Partial<ExecutionLedgerRow> = {}): ExecutionLedgerRow {
	nextId += 1;
	return {
		id: String(nextId),
		executionId: String(nextId),
		occurredAt: new Date('2026-01-01T00:00:00Z'),
		entityType: 'workflow',
		entityName: 'Workflow',
		entityId: 'wf-1',
		projectId: 'project-1',
		mode: 'webhook',
		source: 'none',
		event: 'ended',
		outcome: 'success',
		blockedBy: 'none',
		runtimeMs: 0,
		timeSavedMin: 0,
		origin: 'v1',
		eventId: `event-${nextId}`,
		...overrides,
	};
}

const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 0, minutes));

describe('toStatisticsIncrements', () => {
	test('returns an empty list for no rows', () => {
		expect(toStatisticsIncrements([])).toEqual([]);
	});

	test('ignores an engine v2 row', () => {
		expect(toStatisticsIncrements([row({ origin: 'v2' })])).toEqual([]);
	});

	test('counts a row with no project', () => {
		expect(toStatisticsIncrements([row({ projectId: null })])).toEqual([
			expect.objectContaining({ workflowId: 'wf-1', count: 1, rootCount: 1 }),
		]);
	});

	test('ignores a row with a mode the rules do not know', () => {
		expect(toStatisticsIncrements([row({ mode: 'futureMode' })])).toEqual([]);
	});

	test('ignores a blocked row', () => {
		expect(toStatisticsIncrements([row({ outcome: 'blocked', blockedBy: 'policy' })])).toEqual([]);
	});

	test('takes the counter and the root count from the counting rules', () => {
		const increments = toStatisticsIncrements([
			row(),
			row({ entityId: 'wf-2', outcome: 'error', mode: 'integrated' }),
		]);

		expect(increments).toEqual([
			expect.objectContaining({ name: StatisticsNames.productionSuccess, count: 1, rootCount: 1 }),
			expect.objectContaining({ name: StatisticsNames.productionError, count: 1, rootCount: 0 }),
		]);
	});

	test('groups the rows of one workflow and counter, whatever their order', () => {
		const rows = [
			row({ occurredAt: at(5), entityName: 'Newest', outcome: 'success' }),
			row({ occurredAt: at(1), entityName: 'Oldest', outcome: 'success' }),
			row({ occurredAt: at(3), entityName: 'Middle', outcome: 'success', mode: 'integrated' }),
		];

		expect(toStatisticsIncrements(rows)).toEqual([
			{
				workflowId: 'wf-1',
				name: StatisticsNames.productionSuccess,
				count: 3,
				rootCount: 2,
				latestEvent: at(5),
				firstEvent: at(1),
				workflowName: 'Newest',
			},
		]);
	});

	test('sorts the output by workflow id then counter name for any input order', () => {
		const rows = [
			row({ entityId: 'wf-b', outcome: 'success' }),
			row({ entityId: 'wf-a', outcome: 'success' }),
			row({ entityId: 'wf-a', outcome: 'error' }),
			row({ entityId: 'wf-b', outcome: 'error' }),
		];
		const expected = [
			['wf-a', StatisticsNames.productionError],
			['wf-a', StatisticsNames.productionSuccess],
			['wf-b', StatisticsNames.productionError],
			['wf-b', StatisticsNames.productionSuccess],
		];
		const keys = (input: ExecutionLedgerRow[]) =>
			toStatisticsIncrements(input).map(({ workflowId, name }) => [workflowId, name]);

		expect(keys(rows)).toEqual(expected);
		expect(keys([...rows].reverse())).toEqual(expected);
	});
});
