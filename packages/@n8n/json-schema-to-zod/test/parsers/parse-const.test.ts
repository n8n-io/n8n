import { z } from 'zod';

import { parseConst } from '../../src/parsers/parse-const';

describe('parseConst', () => {
	test('should handle falsy constants', () => {
		expect(
			parseConst({
				const: false,
			}),
		).toMatchZod(z.literal(false));
	});
});
