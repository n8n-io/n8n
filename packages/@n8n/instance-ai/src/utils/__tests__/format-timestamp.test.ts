import { formatTimestamp } from '../format-timestamp';

describe('formatTimestamp', () => {
	it('formats a date in the current year without year', () => {
		const now = new Date();
		const iso = `${now.getFullYear()}-03-19T14:30:00.000Z`;
		const result = formatTimestamp(iso);

		expect(result).toContain('Mar');
		expect(result).toContain('19');
		// Should not include the year when it's the current year
		expect(result).not.toContain(String(now.getFullYear()));
	});

	it('formats a date in a different year with year', () => {
		const result = formatTimestamp('2020-12-25T08:15:30.000Z');

		expect(result).toContain('Dec');
		expect(result).toContain('25');
		expect(result).toContain('2020');
	});

	it('uses 24-hour time format', () => {
		const result = formatTimestamp('2020-06-15T14:30:45.000Z');

		// Time should be in 24h format (en-GB locale)
		expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
	});

	it('handles midnight', () => {
		const result = formatTimestamp('2020-01-01T00:00:00.000Z');

		expect(result).toContain('Jan');
		expect(result).toContain('1');
	});
});
