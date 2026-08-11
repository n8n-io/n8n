import { VIEWS } from './views';

describe('VIEWS', () => {
	it('exposes a runtime object (not an erased const enum)', () => {
		expect(typeof VIEWS).toBe('object');
		expect(VIEWS.HOMEPAGE).toBe('Homepage');
	});

	it('has unique values across all members', () => {
		const values = Object.values(VIEWS);
		expect(new Set(values).size).toBe(values.length);
	});
});
