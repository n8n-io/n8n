import { BUCKET_COUNT, getBucketIndex } from './bucket';

describe('getBucketIndex', () => {
	it('returns stable bucket indices (changing these busts all icon chunk caches)', () => {
		expect(getBucketIndex('a-arrow-down')).toBe(11);
		expect(getBucketIndex('acorn')).toBe(6);
		expect(getBucketIndex('smile')).toBe(15);
		expect(getBucketIndex('star')).toBe(1);
		expect(getBucketIndex('zap')).toBe(12);
	});

	it('returns integer indices within [0, BUCKET_COUNT)', () => {
		const names = ['', 'a', 'zap', 'layout-grid', 'a-very-long-icon-name-with-many-segments'];
		for (const name of names) {
			const index = getBucketIndex(name);
			expect(Number.isInteger(index)).toBe(true);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(BUCKET_COUNT);
		}
	});
});
