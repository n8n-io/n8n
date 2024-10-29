import { omit } from '../../src/utils/omit';

describe('omit', () => {
	test('omit', () => {
		const input = {
			a: true,
			b: true,
		};

		omit(
			input,
			'b',
			// @ts-expect-error
			'c',
		);

		const output = omit(input, 'b');

		// @ts-expect-error
		output.b;

		expect(output.a).toBe(true);

		// @ts-expect-error
		expect(output.b).toBeUndefined();
	});
});
