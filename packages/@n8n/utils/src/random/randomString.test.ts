import { ALPHABET } from '@n8n/constants/alphabet';

import { randomString } from './randomString';
import { repeat } from '../__tests__/utils';

describe('randomString', () => {
	it('should return a random string of the specified length', () => {
		repeat(() => {
			const result = randomString(42);
			expect(result).toHaveLength(42);
		});
	});

	it('should return a random string of the in the length range', () => {
		repeat(() => {
			const result = randomString(10, 100);
			expect(result.length).toBeGreaterThanOrEqual(10);
			expect(result.length).toBeLessThanOrEqual(100);
		});
	});

	it('should only contain characters from the specified character set', () => {
		repeat(() => {
			const result = randomString(1000);
			result.split('').every((char) => ALPHABET.includes(char));
		});
	});
});
