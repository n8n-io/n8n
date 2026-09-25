import { inferType, profileItems } from './profile';

describe('inferType', () => {
	it('classifies scalars and containers', () => {
		expect(inferType(12)).toBe('number');
		expect(inferType('12')).toBe('number');
		expect(inferType('anna@example.com')).toBe('email');
		expect(inferType('https://n8n.io')).toBe('url');
		expect(inferType('2026-09-21')).toBe('date');
		expect(inferType('2026-09-21T10:00:00Z')).toBe('date');
		expect(inferType({ LinkedIn: 7, Referral: 3 })).toBe('object<number>');
		expect(inferType({ a: 'x' })).toBe('object');
		expect(inferType([1, 2])).toBe('array<number>');
		expect(inferType([{ a: 1 }])).toBe('array<object>');
		expect(inferType(null)).toBe('null');
	});
});

describe('profileItems', () => {
	it('profiles top-level and nested paths with presence and samples', () => {
		const fields = profileItems([
			{ total: 12, bySource: { LinkedIn: 7 }, customer: { name: 'Anna', tier: 'gold' } },
			{ total: 8, customer: { name: 'Jonas' } },
		]);
		const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
		expect(byPath.total).toMatchObject({ type: 'number', sample: '12', presence: 1, distinct: 2 });
		expect(byPath.bySource).toMatchObject({ type: 'object<number>', presence: 0.5 });
		expect(byPath['customer.name']).toMatchObject({ type: 'string', sample: 'Anna', presence: 1 });
		expect(byPath['customer.tier']).toMatchObject({ presence: 0.5 });
	});
	it('caps samples at 40 chars and paths at 40', () => {
		const wide = Object.fromEntries(
			Array.from({ length: 60 }, (_, i) => [`k${i}`, 'x'.repeat(100)]),
		);
		const fields = profileItems([wide]);
		expect(fields).toHaveLength(40);
		expect(fields[0].sample.length).toBeLessThanOrEqual(40);
	});
});
