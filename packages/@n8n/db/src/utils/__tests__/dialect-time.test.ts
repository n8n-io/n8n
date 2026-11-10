import {
	dbClockNowLiteral,
	dbClockNowPlusMsLiteral,
	dbTxNowLiteral,
	dbTxNowPlusMsLiteral,
	laterOfColumnAndTxNowPlusMsLiteral,
	parseDbTime,
} from '../dialect-time';

describe('dbTxNowLiteral', () => {
	it('uses millisecond precision on both dialects', () => {
		expect(dbTxNowLiteral(true)).toBe('CURRENT_TIMESTAMP(3)');
		expect(dbTxNowLiteral(false)).toBe("STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')");
	});
});

describe('dbTxNowPlusMsLiteral', () => {
	it('offsets the DB clock by whole milliseconds on postgres', () => {
		expect(dbTxNowPlusMsLiteral(true, 1500)).toBe(
			"CURRENT_TIMESTAMP(3) + (1500 || ' milliseconds')::interval",
		);
	});

	it('offsets the DB clock by seconds on sqlite', () => {
		expect(dbTxNowPlusMsLiteral(false, 1500)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+1.5 seconds')",
		);
	});

	it('rounds a fractional offset so the literal stays a plain number', () => {
		expect(dbTxNowPlusMsLiteral(true, 1000.4)).toBe(
			"CURRENT_TIMESTAMP(3) + (1000 || ' milliseconds')::interval",
		);
	});

	it('offsets the DB clock into the past on postgres', () => {
		expect(dbTxNowPlusMsLiteral(true, -1500)).toBe(
			"CURRENT_TIMESTAMP(3) + (-1500 || ' milliseconds')::interval",
		);
	});

	// A '+-1.5 seconds' modifier would be invalid: STRFTIME returns NULL and the
	// comparison silently matches nothing, so the sign must replace the '+'.
	it('offsets the DB clock into the past on sqlite without a doubled sign', () => {
		expect(dbTxNowPlusMsLiteral(false, -1500)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '-1.5 seconds')",
		);
	});

	it('treats a negative offset that rounds to zero as now on sqlite', () => {
		expect(dbTxNowPlusMsLiteral(false, -0.4)).toBe(
			"STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+0 seconds')",
		);
	});
});

describe('laterOfColumnAndTxNowPlusMsLiteral', () => {
	it('takes the later of the column and the offset on postgres', () => {
		expect(laterOfColumnAndTxNowPlusMsLiteral(true, '"backoffUntil"', 5000)).toBe(
			'GREATEST(COALESCE("backoffUntil", CURRENT_TIMESTAMP(3)), CURRENT_TIMESTAMP(3) + (5000 || \' milliseconds\')::interval)',
		);
	});

	it('takes the later of the column and the offset on sqlite', () => {
		expect(laterOfColumnAndTxNowPlusMsLiteral(false, '"backoffUntil"', 5000)).toBe(
			"MAX(COALESCE(\"backoffUntil\", STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '+5 seconds'))",
		);
	});

	// SQLite's scalar MAX returns NULL as soon as one argument is NULL, so without
	// the COALESCE a first failure would clear the deadline instead of setting it.
	it('coalesces the column on both dialects, so a null one cannot swallow the offset', () => {
		expect(laterOfColumnAndTxNowPlusMsLiteral(true, '"backoffUntil"', 5000)).toContain(
			'COALESCE("backoffUntil"',
		);
		expect(laterOfColumnAndTxNowPlusMsLiteral(false, '"backoffUntil"', 5000)).toContain(
			'COALESCE("backoffUntil"',
		);
	});
});

describe('dbClockNowLiteral', () => {
	it('uses the statement clock at millisecond precision on postgres', () => {
		expect(dbClockNowLiteral(true)).toBe('clock_timestamp()::timestamptz(3)');
	});

	it('matches the transaction literal on sqlite', () => {
		expect(dbClockNowLiteral(false)).toBe(dbTxNowLiteral(false));
	});
});

describe('dbClockNowPlusMsLiteral', () => {
	it('offsets the statement clock by whole milliseconds on postgres', () => {
		expect(dbClockNowPlusMsLiteral(true, 1500)).toBe(
			"clock_timestamp()::timestamptz(3) + (1500 || ' milliseconds')::interval",
		);
	});

	it('matches the transaction literal on sqlite', () => {
		expect(dbClockNowPlusMsLiteral(false, 1500)).toBe(dbTxNowPlusMsLiteral(false, 1500));
		expect(dbClockNowPlusMsLiteral(false, -1500)).toBe(dbTxNowPlusMsLiteral(false, -1500));
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
