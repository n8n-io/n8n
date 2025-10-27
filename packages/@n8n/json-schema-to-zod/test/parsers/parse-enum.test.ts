import { z } from 'zod';

import { parseEnum } from '../../src/parsers/parse-enum';

describe('parseEnum', () => {
	test('should create never with empty enum', () => {
		expect(
			parseEnum({
				enum: [],
			}),
		).toMatchZod(z.never());
	});

	test('should create literal with single item enum', () => {
		expect(
			parseEnum({
				enum: ['someValue'],
			}),
		).toMatchZod(z.literal('someValue'));
	});

	test('should create enum array with string enums', () => {
		expect(
			parseEnum({
				enum: ['someValue', 'anotherValue'],
			}),
		).toMatchZod(z.enum(['someValue', 'anotherValue']));
	});
	test('should create union with mixed enums', () => {
		expect(
			parseEnum({
				enum: ['someValue', 57],
			}),
		).toMatchZod(z.union([z.literal('someValue'), z.literal(57)]));
	});
});
