import type { UsagePeriod } from '../execution-usage-period';
import { toUsage, type UsageScope, type UsageTotals } from '../execution-usage';

const scope: UsageScope = { type: 'instance' };
const period: UsagePeriod = {
	unit: 'month',
	firstDay: '2026-11-01',
	lastDay: '2026-11-30',
	resetsAt: new Date('2026-12-01T00:00:00.000Z'),
};

const totals = (
	startedCount: number,
	blockedCount: number,
	lastCountedAt: Date | null = null,
): UsageTotals => ({ startedCount, blockedCount, lastCountedAt });

describe('toUsage', () => {
	it('adds started minus blocked across the parts', () => {
		const usage = toUsage(scope, period, totals(10, 2), totals(5, 1));

		expect(usage.executions).toBe(12);
		expect(usage.scope).toBe(scope);
		expect(usage.period).toBe(period);
	});

	it('clamps a negative total to zero', () => {
		expect(toUsage(scope, period, totals(1, 4)).executions).toBe(0);
	});

	it('keeps the latest counted time', () => {
		const early = new Date('2026-11-10T00:00:00.000Z');
		const late = new Date('2026-11-12T00:00:00.000Z');

		expect(toUsage(scope, period, totals(1, 0, late), totals(1, 0, early)).lastCountedAt).toEqual(
			late,
		);
		expect(toUsage(scope, period, totals(1, 0, early), totals(1, 0, late)).lastCountedAt).toEqual(
			late,
		);
	});

	it('ignores a part without a counted time when others have one', () => {
		const at = new Date('2026-11-10T00:00:00.000Z');

		expect(toUsage(scope, period, totals(1, 0), totals(1, 0, at)).lastCountedAt).toEqual(at);
	});

	it('has a null counted time when every part has none', () => {
		expect(toUsage(scope, period, totals(1, 0), totals(2, 0)).lastCountedAt).toBeNull();
	});

	it('gives zero and null for no parts', () => {
		expect(toUsage(scope, period)).toEqual({ scope, period, executions: 0, lastCountedAt: null });
	});
});
