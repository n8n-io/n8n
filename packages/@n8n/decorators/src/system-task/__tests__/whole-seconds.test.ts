import { wholeSeconds } from '../whole-seconds';

describe('wholeSeconds', () => {
	it.each([
		[3600, 3600],
		[0.1 * 3600, 360],
		[90.4, 90],
		[0.2, 1],
	])('rounds %s seconds to %s', (seconds, expected) => {
		expect(wholeSeconds(seconds)).toBe(expected);
	});
});
