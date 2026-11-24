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

		const counts = { day: '2026-10-28', entityType: 'workflow', startedCount: 3, blockedCount: 0 };
		expect(deltas).toEqual({
			projects: [{ projectId: 'project-1', ...counts }],
			instance: [counts],
		});
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

	it('counts a v2 row like a v1 row', () => {
		expect(toUsageDeltas([ledgerRow({ origin: 'v2' })])).toEqual(
			toUsageDeltas([ledgerRow({ origin: 'v1' })]),
		);
	});

	it('gives an agent entity its own key', () => {
		const deltas = toUsageDeltas([ledgerRow(), ledgerRow({ entityType: 'agent' })]);

		const counts = (entityType: string) => ({
			day: '2026-10-28',
			entityType,
			startedCount: 1,
			blockedCount: 0,
		});
		expect(deltas).toEqual({
			projects: [
				{ projectId: 'project-1', ...counts('agent') },
				{ projectId: 'project-1', ...counts('workflow') },
			],
			instance: [counts('agent'), counts('workflow')],
		});
	});

	it('uses the UTC day when the local day is already the next one', () => {
		process.env.TZ = 'Pacific/Kiritimati';

		const deltas = toUsageDeltas([ledgerRow({ occurredAt: new Date('2026-11-19T23:59:59.999Z') })]);

		expect(deltas.projects.map((d) => d.day)).toEqual(['2026-11-19']);
		expect(deltas.instance.map((d) => d.day)).toEqual(['2026-11-19']);
	});

	it('gives only an instance delta for a row with no project', () => {
		const deltas = toUsageDeltas([ledgerRow({ projectId: null as unknown as string })]);

		expect(deltas.projects).toEqual([]);
		expect(deltas.instance).toEqual([expect.objectContaining({ startedCount: 1 })]);
	});

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
