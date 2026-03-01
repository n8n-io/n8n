import { returnJsonArray } from '../return-json-array';

describe('returnJsonArray', () => {
	test.each([
		{
			input: { name: 'John', age: 30 },
			expected: [{ json: { name: 'John', age: 30 } }],
			description: 'should convert a single object to an array with json key',
		},
		{
			input: [{ name: 'John' }, { name: 'Jane' }],
			expected: [{ json: { name: 'John' } }, { json: { name: 'Jane' } }],
			description: 'should return an array of objects with json key',
		},
		{
			input: [{ json: { name: 'John' }, additionalProp: 'value' }],
			expected: [{ json: { name: 'John' }, additionalProp: 'value' }],
			description: 'should preserve existing json key in object',
		},
		{
			input: [],
			expected: [],
			description: 'should handle empty array input',
		},
		{
			input: [{ name: 'John' }, { json: { name: 'Jane' }, additionalProp: 'value' }],
			expected: [{ json: { name: 'John' } }, { json: { name: 'Jane' }, additionalProp: 'value' }],
			description: 'should handle mixed input with some objects having json key',
		},
	])('$description', ({ input, expected }) => {
		const result = returnJsonArray(input);
		expect(result).toEqual(expected);
	});
});
