import { addUtcDays, periodRange, toUtcDay } from '../execution-usage-period';

describe('periodRange', () => {
	describe('day', () => {
		it.each(['2026-11-20T00:00:00.000Z', '2026-11-20T23:59:59.999Z'])(
			'gives the same day for %s',
			(at) => {
				const period = periodRange('day', new Date(at));

				expect(period.firstDay).toBe('2026-11-20');
				expect(period.lastDay).toBe('2026-11-20');
				expect(period.resetsAt).toEqual(new Date('2026-11-21T00:00:00.000Z'));
			},
		);
	});

	describe('week', () => {
		it('starts a week on Monday at 00:00 UTC', () => {
			const period = periodRange('week', new Date('2026-11-16T00:00:00.000Z'));

			expect(period.firstDay).toBe('2026-11-16');
			expect(period.lastDay).toBe('2026-11-22');
		});

		it('keeps Sunday 23:59:59.999 UTC in the same week', () => {
			const period = periodRange('week', new Date('2026-11-22T23:59:59.999Z'));

			expect(period.firstDay).toBe('2026-11-16');
			expect(period.lastDay).toBe('2026-11-22');
			expect(period.resetsAt).toEqual(new Date('2026-11-23T00:00:00.000Z'));
		});

		it('resets on the next Monday at 00:00 UTC', () => {
			const period = periodRange('week', new Date('2026-11-18T12:00:00.000Z'));

			expect(period.resetsAt).toEqual(new Date('2026-11-23T00:00:00.000Z'));
		});

		it('handles a week that crosses a year', () => {
			const period = periodRange('week', new Date('2027-01-01T08:00:00.000Z'));

			expect(period.firstDay).toBe('2026-12-28');
			expect(period.lastDay).toBe('2027-01-03');
			expect(period.resetsAt).toEqual(new Date('2027-01-04T00:00:00.000Z'));
		});
	});

	describe('month', () => {
		it('ends a leap February on the 29th', () => {
			const period = periodRange('month', new Date('2028-02-10T00:00:00.000Z'));

			expect(period.firstDay).toBe('2028-02-01');
			expect(period.lastDay).toBe('2028-02-29');
			expect(period.resetsAt).toEqual(new Date('2028-03-01T00:00:00.000Z'));
		});

		it('ends a common February on the 28th', () => {
			const period = periodRange('month', new Date('2027-02-28T23:59:59.999Z'));

			expect(period.firstDay).toBe('2027-02-01');
			expect(period.lastDay).toBe('2027-02-28');
		});

		it('resets on 1 January after December', () => {
			const period = periodRange('month', new Date('2026-12-15T00:00:00.000Z'));

			expect(period.firstDay).toBe('2026-12-01');
			expect(period.lastDay).toBe('2026-12-31');
			expect(period.resetsAt).toEqual(new Date('2027-01-01T00:00:00.000Z'));
		});
	});

	it('returns the unit it was given', () => {
		expect(periodRange('week', new Date('2026-11-20T00:00:00.000Z')).unit).toBe('week');
	});
});

describe('addUtcDays', () => {
	it('goes back one day across a month boundary', () => {
		expect(addUtcDays('2026-11-01', -1)).toBe('2026-10-31');
	});

	it('goes back one day across a year boundary', () => {
		expect(addUtcDays('2027-01-01', -1)).toBe('2026-12-31');
	});

	it('goes forward', () => {
		expect(addUtcDays('2028-02-28', 2)).toBe('2028-03-01');
	});
});

describe('time zone independence', () => {
	const originalTz = process.env.TZ;

	afterEach(() => {
		if (originalTz === undefined) delete process.env.TZ;
		else process.env.TZ = originalTz;
	});

	it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago'])(
		'gives the same days when the process time zone is %s',
		(timeZone) => {
			process.env.TZ = timeZone;
			const at = new Date('2026-11-22T23:59:59.999Z');

			expect(toUtcDay(at)).toBe('2026-11-22');
			expect(addUtcDays('2026-11-01', -1)).toBe('2026-10-31');
			expect(periodRange('week', at)).toEqual({
				unit: 'week',
				firstDay: '2026-11-16',
				lastDay: '2026-11-22',
				resetsAt: new Date('2026-11-23T00:00:00.000Z'),
			});
			expect(periodRange('month', at).lastDay).toBe('2026-11-30');
		},
	);
});
