import type { z } from 'zod';
import { expect } from 'vitest';

interface CustomMatchers<R = unknown> {
	toMatchZod(expected: z.ZodTypeAny): R;
}

declare module 'vitest' {
	interface Assertion<T = unknown> extends CustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
	toMatchZod(actual: z.ZodTypeAny, expected: z.ZodTypeAny) {
		const actualSerialized = JSON.stringify(actual._def, null, 2);
		const expectedSerialized = JSON.stringify(expected._def, null, 2);
		const pass = actualSerialized === expectedSerialized;

		return {
			pass,
			message: pass
				? () => `Expected ${actualSerialized} not to match ${expectedSerialized}`
				: () => `Expected ${actualSerialized} to match ${expectedSerialized}`,
		};
	},
});
