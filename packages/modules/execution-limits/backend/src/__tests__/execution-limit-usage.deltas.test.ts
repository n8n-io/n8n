import { toUsageDeltas } from '../execution-limit-usage.deltas';
import { ledgerRow } from './ledger-rows';

describe('toUsageDeltas', () => {
	const originalTimeZone = process.env.TZ;

	afterEach(() => {
		if (originalTimeZone === undefined) delete process.env.TZ;
		else process.env.TZ = originalTimeZone;
	});

	const NONE = { projects: [], instance: [] };

	it('gives empty lists for no rows', () => {
		expect(toUsageDeltas([])).toEqual(NONE);
	});

	it('gives a project delta and an instance delta for a counted start', () => {
		const deltas = toUsageDeltas([
			ledgerRow({ projectId: 'p1', occurredAt: new Date('2026-11-19T10:00:00Z') }),
		]);

		const counts = { day: '2026-11-19', entityType: 'workflow', startedCount: 1, blockedCount: 0 };
		expect(deltas).toEqual({ projects: [{ projectId: 'p1', ...counts }], instance: [counts] });
	});

	it('merges rows with the same key into one delta', () => {
		const deltas = toUsageDeltas([ledgerRow(), ledgerRow(), ledgerRow()]);

		expect(deltas.projects).toHaveLength(1);
		expect(deltas.instance).toHaveLength(1);
		expect(
			[...deltas.projects, ...deltas.instance].every(
				(d) => d.startedCount === 3 && d.blockedCount === 0,
			),
		).toBe(true);
	});

	it('sorts the deltas by key and keeps keys unique', () => {
		const deltas = toUsageDeltas([
			ledgerRow({ projectId: 'b', occurredAt: new Date('2026-11-20T10:00:00Z') }),
			ledgerRow({ projectId: 'a', occurredAt: new Date('2026-11-21T10:00:00Z') }),
			ledgerRow({ projectId: 'b', occurredAt: new Date('2026-11-20T11:00:00Z') }),
			ledgerRow({ projectId: 'a', occurredAt: new Date('2026-11-19T10:00:00Z') }),
		]);

		const keys = deltas.projects.map((d) => `${d.projectId}|${d.day}|${d.entityType}`);
		expect(keys).toEqual([...keys].sort());
		expect(new Set(keys).size).toBe(keys.length);
		expect(deltas.instance.map((d) => d.day)).toEqual(['2026-11-19', '2026-11-20', '2026-11-21']);
	});

	it.each(['unknown-mode', 'constructor'])('counts nowhere for the mode %s', (mode) => {
		expect(toUsageDeltas([ledgerRow({ mode })])).toEqual(NONE);
	});

	it.each(['unknown-source', 'toString'])('counts nowhere for the source %s', (source) => {
		expect(toUsageDeltas([ledgerRow({ source })])).toEqual(NONE);
	});

	it('counts a v2 row like a v1 row', () => {
		expect(toUsageDeltas([ledgerRow({ origin: 'v2' })])).toEqual(
			toUsageDeltas([ledgerRow({ origin: 'v1' })]),
		);
	});

	it('gives an agent entity its own key', () => {
		const deltas = toUsageDeltas([ledgerRow(), ledgerRow({ entityType: 'agent' })]);

		expect(deltas.projects.map((d) => d.entityType)).toEqual(['agent', 'workflow']);
		expect(deltas.instance.map((d) => d.entityType)).toEqual(['agent', 'workflow']);
		expect([...deltas.projects, ...deltas.instance].every((d) => d.startedCount === 1)).toBe(true);
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

			expect(deltas.projects.map((d) => d.day)).toEqual([day]);
			expect(deltas.instance.map((d) => d.day)).toEqual([day]);
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

		const counts = { day: '2026-11-20', entityType: 'workflow', startedCount: 0, blockedCount: 1 };
		expect(deltas).toEqual({ projects: [{ projectId: 'p1', ...counts }], instance: [counts] });
	});

	it('gives no delta for a blocked end of a mode that is not counted', () => {
		expect(
			toUsageDeltas([ledgerRow({ mode: 'manual', event: 'ended', outcome: 'blocked' })]),
		).toEqual(NONE);
	});
});
