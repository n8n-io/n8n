import { dbNowLiteral, dbNowPlusMsLiteral, parseDbTime } from '../dialect-time';

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

describe('parseDbTime', () => {
	it('passes a Date through (postgres)', () => {
		const date = new Date('2026-07-03T12:00:00.123Z');
		expect(parseDbTime(date)).toBe(date);
	});

	it('parses sqlite wall-clock text as UTC', () => {
		expect(parseDbTime('2026-07-03 12:00:00.123')).toEqual(new Date('2026-07-03T12:00:00.123Z'));
	});
});
