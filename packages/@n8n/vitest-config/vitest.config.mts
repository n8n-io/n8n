import { defineConfig } from 'vitest/config';

// Deliberately not built from `createVitestConfig` (this package's own frontend
// factory): that points `setupFiles` at a consumer's `src/__tests__/setup.ts`,
// and these tests import the harness themselves to assert on what it patches.
export default defineConfig({
	test: {
		environment: 'jsdom',
		restoreMocks: true,
		reporters: process.env.CI === 'true' ? ['default', 'junit'] : ['default'],
		outputFile: { junit: './junit.xml' },
	},
});
