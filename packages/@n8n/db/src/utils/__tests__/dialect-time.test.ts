import {
	dbNowLiteral,
	dbNowPlusMsLiteral,
	laterOfColumnAndNowPlusMsLiteral,
	parseDbTime,
} from '../dialect-time';

describe('dbNowLiteral', () => {
	it('uses millisecond precision on both dialects', () => {
		expect(dbNowLiteral(true)).toBe('CURRENT_TIMESTAMP(3)');
		expect(dbNowLiteral(false)).toBe("STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')");
	});
});

describe('dbNowPlusMsLiteral', () => {
	it('offsets the DB clock by whole milliseconds on postgres', () => {
		expect(dbNowPlusMsLiteral(true, 1500)).toBe(
			"CURRENT_TIMESTAMP(3) + (1500 || ' milliseconds')::interval",
		);
	});

	it('offsets the DB clock by seconds on sqlite', () => {
		expect(dbNowPlusMsLiteral(false, 1500)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+1.5 seconds')",
		);
	});

	it('rounds a fractional offset so the literal stays a plain number', () => {
		expect(dbNowPlusMsLiteral(true, 1000.4)).toBe(
			"CURRENT_TIMESTAMP(3) + (1000 || ' milliseconds')::interval",
		);
	});

	it('offsets the DB clock into the past on postgres', () => {
		expect(dbNowPlusMsLiteral(true, -1500)).toBe(
			"CURRENT_TIMESTAMP(3) + (-1500 || ' milliseconds')::interval",
		);
	});

	// A '+-1.5 seconds' modifier would be invalid: STRFTIME returns NULL and the
	// comparison silently matches nothing, so the sign must replace the '+'.
	it('offsets the DB clock into the past on sqlite without a doubled sign', () => {
		expect(dbNowPlusMsLiteral(false, -1500)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '-1.5 seconds')",
		);
	});

	it('treats a negative offset that rounds to zero as now on sqlite', () => {
		expect(dbNowPlusMsLiteral(false, -0.4)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+0 seconds')",
		);
	});
});

describe('laterOfColumnAndNowPlusMsLiteral', () => {
	it('takes the later of the column and the offset on postgres', () => {
		expect(laterOfColumnAndNowPlusMsLiteral(true, '"backoffUntil"', 5000)).toBe(
			'GREATEST(COALESCE("backoffUntil", CURRENT_TIMESTAMP(3)), CURRENT_TIMESTAMP(3) + (5000 || \' milliseconds\')::interval)',
		);
	});

	it('takes the later of the column and the offset on sqlite', () => {
		expect(laterOfColumnAndNowPlusMsLiteral(false, '"backoffUntil"', 5000)).toBe(
			"MAX(COALESCE(\"backoffUntil\", STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+5 seconds'))",
		);
	});

	// SQLite's scalar MAX returns NULL as soon as one argument is NULL, so without
	// the COALESCE a first failure would clear the deadline instead of setting it.
	it('coalesces the column on both dialects, so a null one cannot swallow the offset', () => {
		expect(laterOfColumnAndNowPlusMsLiteral(true, '"backoffUntil"', 5000)).toContain(
			'COALESCE("backoffUntil"',
		);
		expect(laterOfColumnAndNowPlusMsLiteral(false, '"backoffUntil"', 5000)).toContain(
			'COALESCE("backoffUntil"',
		);
	});
});

describe('parseDbTime', () => {
	it('passes a Date through (postgres)', () => {
		const date = new Date('2026-07-03T12:00:00.123Z');
		expect(parseDbTime(date)).toBe(date);
	});

	it('parses sqlite wall-clock text as UTC', () => {
		expect(parseDbTime('2026-07-03 12:00:00.123')).toEqual(new Date('2026-07-03T12:00:00.123Z'));
	});
});
