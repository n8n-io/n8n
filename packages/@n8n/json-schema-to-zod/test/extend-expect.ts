import type { z } from 'zod';

expect.extend({
	toMatchZod(this: jest.MatcherContext, actual: z.ZodTypeAny, expected: z.ZodTypeAny) {
		const actualSerialized = JSON.stringify(actual._def, null, 2);
		const expectedSerialized = JSON.stringify(expected._def, null, 2);
		const pass = this.equals(actualSerialized, expectedSerialized);

		return {
			pass,
			message: pass
				? () => `Expected ${actualSerialized} not to match ${expectedSerialized}`
				: () => `Expected ${actualSerialized} to match ${expectedSerialized}`,
		};
	},
});
