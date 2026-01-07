import { generateJsonSchema } from './json-schema';

describe('util: JSON Schema', () => {
	test.each([
		{ message: 'a string', input: 'foo', output: { type: 'string' } },
		{
			message: 'a simple object',
			input: { a: 'foo', b: 4, c: true },
			output: {
				properties: {
					a: { type: 'string' },
					b: { type: 'number' },
					c: { type: 'boolean' },
				},
				type: 'object',
			},
		},
		{
			message: 'a nested object',
			input: { nested: { foo: 'bar', array: [{ a: 1 }] } },
			output: {
				type: 'object',
				properties: {
					nested: {
						type: 'object',
						properties: {
							array: {
								items: {
									properties: {
										a: { type: 'number' },
									},
									type: 'object',
								},
								type: 'array',
							},
							foo: { type: 'string' },
						},
					},
				},
			},
		},
	])('should generate a valid JSON schema for $message', ({ input, output }) => {
		expect(generateJsonSchema(input)).toEqual(output);
	});
});
