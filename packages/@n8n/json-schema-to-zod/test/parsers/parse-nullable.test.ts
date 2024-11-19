import { z } from 'zod';

import { parseSchema } from '../../src/parsers/parse-schema';

describe('parseNullable', () => {
	test('parseSchema should not add default twice', () => {
		expect(
			parseSchema(
				{
					type: 'string',
					nullable: true,
					default: null,
				},
				{ path: [], seen: new Map() },
			),
		).toMatchZod(z.string().nullable().default(null));
	});
});
