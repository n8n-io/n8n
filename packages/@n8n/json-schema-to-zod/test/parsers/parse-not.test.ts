import { z } from 'zod';

import { parseNot } from '../../src/parsers/parse-not';

describe('parseNot', () => {
	test('parseNot', () => {
		expect(
			parseNot(
				{
					not: {
						type: 'string',
					},
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(
			z
				.any()
				.refine(
					(value) => !z.string().safeParse(value).success,
					'Invalid input: Should NOT be valid against schema',
				),
		);
	});
});
