import { toUsageDeltas } from '../execution-limit-usage.deltas';
import { EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID } from '../execution-limits.types';
import { ledgerRow } from './ledger-rows';

const INSTANCE = EXECUTION_LIMIT_USAGE_INSTANCE_SCOPE_ID;

describe('toUsageDeltas', () => {
	const originalTimeZone = process.env.TZ;

	afterEach(() => {
		if (originalTimeZone === undefined) delete process.env.TZ;
		else process.env.TZ = originalTimeZone;
	});

	it('gives an empty list for no rows', () => {
		expect(toUsageDeltas([])).toEqual([]);
	});

	it('gives a project delta and an instance delta for a counted start', () => {
		const deltas = toUsageDeltas([
			ledgerRow({ projectId: 'p1', occurredAt: new Date('2026-11-19T10:00:00Z') }),
		]);

		expect(deltas).toEqual([
			{
				projectId: INSTANCE,
				day: '2026-11-19',
				entityType: 'workflow',
				startedCount: 1,
				blockedCount: 0,
			},
			{
				projectId: 'p1',
				day: '2026-11-19',
				entityType: 'workflow',
				startedCount: 1,
				blockedCount: 0,
			},
		]);
	});

	it('merges rows with the same key into one delta', () => {
		const deltas = toUsageDeltas([ledgerRow(), ledgerRow(), ledgerRow()]);

		expect(deltas).toHaveLength(2);
		expect(deltas.every((d) => d.startedCount === 3 && d.blockedCount === 0)).toBe(true);
	});

	it('sorts the deltas by key and keeps keys unique', () => {
		const deltas = toUsageDeltas([
			ledgerRow({ projectId: 'b', occurredAt: new Date('2026-11-20T10:00:00Z') }),
			ledgerRow({ projectId: 'a', occurredAt: new Date('2026-11-21T10:00:00Z') }),
			ledgerRow({ projectId: 'b', occurredAt: new Date('2026-11-20T11:00:00Z') }),
			ledgerRow({ projectId: 'a', occurredAt: new Date('2026-11-19T10:00:00Z') }),
		]);

		const keys = deltas.map((d) => `${d.projectId}|${d.day}|${d.entityType}`);
		expect(keys).toEqual([...keys].sort());
		expect(new Set(keys).size).toBe(keys.length);
	});

	it.each(['unknown-mode', 'constructor'])('counts nowhere for the mode %s', (mode) => {
		expect(toUsageDeltas([ledgerRow({ mode })])).toEqual([]);
	});

	it.each(['unknown-source', 'toString'])('counts nowhere for the source %s', (source) => {
		expect(toUsageDeltas([ledgerRow({ source })])).toEqual([]);
	});

	it('counts a v2 row like a v1 row', () => {
		expect(toUsageDeltas([ledgerRow({ origin: 'v2' })])).toEqual(
			toUsageDeltas([ledgerRow({ origin: 'v1' })]),
		);
	});

	it('gives an agent entity its own key', () => {
		const deltas = toUsageDeltas([ledgerRow(), ledgerRow({ entityType: 'agent' })]);

		expect(deltas.map((d) => d.entityType).sort()).toEqual([
			'agent',
			'agent',
			'workflow',
			'workflow',
		]);
		expect(deltas.every((d) => d.startedCount === 1)).toBe(true);
	});

	it.each([
		['Pacific/Kiritimati', '2026-11-19T23:59:59.999Z', '2026-11-19'],
		['Pacific/Kiritimati', '2026-11-20T00:00:00.000Z', '2026-11-20'],
		['Pacific/Pago_Pago', '2026-11-19T23:59:59.999Z', '2026-11-19'],
		['Pacific/Pago_Pago', '2026-11-20T00:00:00.000Z', '2026-11-20'],
	])(
		'uses the UTC day when the time zone is %s and the time is %s',
		(timeZone, occurredAt, day) => {
			process.env.TZ = timeZone;

			const deltas = toUsageDeltas([ledgerRow({ occurredAt: new Date(occurredAt) })]);

			expect(deltas.map((d) => d.day)).toEqual([day, day]);
		},
	);

	it('counts a blocked end on its own day as a blocked count', () => {
		const deltas = toUsageDeltas([
			ledgerRow({
				projectId: 'p1',
				event: 'ended',
				outcome: 'blocked',
				occurredAt: new Date('2026-11-20T00:01:00Z'),
			}),
		]);

		expect(deltas).toEqual([
			{
				projectId: INSTANCE,
				day: '2026-11-20',
				entityType: 'workflow',
				startedCount: 0,
				blockedCount: 1,
			},
			{
				projectId: 'p1',
				day: '2026-11-20',
				entityType: 'workflow',
				startedCount: 0,
				blockedCount: 1,
			},
		]);
	});

	it('gives no delta for a blocked end of a mode that is not counted', () => {
		expect(
			toUsageDeltas([ledgerRow({ mode: 'manual', event: 'ended', outcome: 'blocked' })]),
		).toEqual([]);
	});
});
