import { z } from 'zod';

import { parseNumber } from '../../src/parsers/parse-number';

describe('parseNumber', () => {
	test('should handle integer', () => {
		expect(
			parseNumber({
				type: 'integer',
			}),
		).toMatchZod(z.number().int());

		expect(
			parseNumber({
				type: 'integer',
				multipleOf: 1,
			}),
		).toMatchZod(z.number().int());

		expect(
			parseNumber({
				type: 'number',
				multipleOf: 1,
			}),
		).toMatchZod(z.number().int());
	});

	test('should handle maximum with exclusiveMinimum', () => {
		expect(
			parseNumber({
				type: 'number',
				exclusiveMinimum: true,
				minimum: 2,
			}),
		).toMatchZod(z.number().gt(2));
	});

	test('should handle maximum with exclusiveMinimum', () => {
		expect(
			parseNumber({
				type: 'number',
				minimum: 2,
			}),
		).toMatchZod(z.number().gte(2));
	});

	test('should handle maximum with exclusiveMaximum', () => {
		expect(
			parseNumber({
				type: 'number',
				exclusiveMaximum: true,
				maximum: 2,
			}),
		).toMatchZod(z.number().lt(2));
	});

	test('should handle numeric exclusiveMaximum', () => {
		expect(
			parseNumber({
				type: 'number',
				exclusiveMaximum: 2,
			}),
		).toMatchZod(z.number().lt(2));
	});

	test('should accept errorMessage', () => {
		expect(
			parseNumber({
				type: 'number',
				format: 'int64',
				exclusiveMinimum: 0,
				maximum: 2,
				multipleOf: 2,
				errorMessage: {
					format: 'ayy',
					multipleOf: 'lmao',
					exclusiveMinimum: 'deez',
					maximum: 'nuts',
				},
			}),
		).toMatchZod(z.number().int('ayy').multipleOf(2, 'lmao').gt(0, 'deez').lte(2, 'nuts'));
	});
});
