import { isoDateProperty } from '../integration-helpers';

describe('integration helpers', () => {
	describe('isoDateProperty', () => {
		it('returns ISO strings for valid date values', () => {
			expect(
				isoDateProperty({ createdAt: new Date('2026-05-18T10:00:00.000Z') }, 'createdAt'),
			).toBe('2026-05-18T10:00:00.000Z');
			expect(isoDateProperty({ createdAt: '2026-05-18T10:00:00.000Z' }, 'createdAt')).toBe(
				'2026-05-18T10:00:00.000Z',
			);
		});

		it('returns undefined for invalid date strings', () => {
			expect(isoDateProperty({ createdAt: 'not-a-date' }, 'createdAt')).toBeUndefined();
		});
	});
});
