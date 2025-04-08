import { unwrapNestedOutput } from '../helpers';

describe('unwrapNestedOutput', () => {
	it('should unwrap doubly nested output', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
					confidence: 0.95,
				},
			},
		};

		const expected = {
			output: {
				text: 'Hello world',
				confidence: 0.95,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(expected);
	});

	it('should not modify regular output object', () => {
		const input = {
			output: {
				text: 'Hello world',
				confidence: 0.95,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify object without output property', () => {
		const input = {
			result: 'success',
			data: {
				text: 'Hello world',
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when output is not an object', () => {
		const input = {
			output: 'Hello world',
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when object has multiple properties', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
				},
			},
			meta: {
				timestamp: 123456789,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when inner output has multiple properties', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
				},
				meta: {
					timestamp: 123456789,
				},
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should handle null values properly', () => {
		const input = {
			output: null,
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should handle empty object values properly', () => {
		const input = {
			output: {},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});
});
