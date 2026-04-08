import { z } from 'zod';

import { parseAnyOf } from '../../src/parsers/parse-any-of';

describe('parseAnyOf', () => {
	test('should create a union from two or more schemas', () => {
		expect(
			parseAnyOf(
				{
					anyOf: [
						{
							type: 'string',
						},
						{ type: 'number' },
					],
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.union([z.string(), z.number()]));
	});

	test('should extract a single schema', () => {
		expect(parseAnyOf({ anyOf: [{ type: 'string' }] }, { path: [], seen: new Map() })).toMatchZod(
			z.string(),
		);
	});

	test('should return z.any() if array is empty', () => {
		expect(parseAnyOf({ anyOf: [] }, { path: [], seen: new Map() })).toMatchZod(z.any());
	});
});
