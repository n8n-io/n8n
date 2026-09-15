import { expect, type MatcherState } from 'vitest';
import type { z } from 'zod';

expect.extend({
	toMatchZod(this: MatcherState, actual: z.ZodTypeAny, expected: z.ZodTypeAny) {
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

interface CustomMatchers<R = unknown> {
	toMatchZod(expected: z.ZodTypeAny): R;
}

declare module 'vitest' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- must mirror Vitest's `Matchers<T = any>` default type param
	interface Matchers<T = any> extends CustomMatchers<T> {
		toMatchZod(expected: z.ZodTypeAny): T;
	}
}
