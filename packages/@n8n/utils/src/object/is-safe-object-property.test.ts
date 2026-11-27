import { isSafeObjectProperty, unsafeObjectProperties } from './is-safe-object-property';

describe('isSafeObjectProperty', () => {
	test.each([...unsafeObjectProperties])('should return false for unsafe property "%s"', (key) => {
		expect(isSafeObjectProperty(key)).toBe(false);
	});

	test.each(['safeKey', 'anotherKey', 'toString', 'valueOf', 'length'])(
		'should return true for safe property "%s"',
		(key) => {
			expect(isSafeObjectProperty(key)).toBe(true);
		},
	);
});
