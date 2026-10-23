import { invert } from './invert';

describe('invert', () => {
	it('swaps object keys and values', () => {
		expect(invert({ first: 1, second: 2 })).toEqual({ 1: 'first', 2: 'second' });
	});
});
