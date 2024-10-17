import { z } from 'zod';

import { parseAllOf } from '../../src/parsers/parse-all-of';

describe('parseAllOf', () => {
	test('should create never if empty', () => {
		expect(
			parseAllOf(
				{
					allOf: [],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.never());
	});

	test('should handle true values', () => {
		expect(
			parseAllOf(
				{
					allOf: [{ type: 'string' }, true],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.intersection(z.string(), z.any()));
	});

	test('should handle false values', () => {
		expect(
			parseAllOf(
				{
					allOf: [{ type: 'string' }, false],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z.intersection(
				z.string(),
				z
					.any()
					.refine(
						(value) => !z.any().safeParse(value).success,
						'Invalid input: Should NOT be valid against schema',
					),
			),
		);
	});
});
