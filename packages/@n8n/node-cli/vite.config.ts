import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		disableConsoleIntercept: true,
		setupFiles: ['src/test-utils/setup.ts'],
		reporters: process.env.CI === 'true' ? ['default', 'junit'] : ['default'],
		outputFile: { junit: './junit.xml' },
		...(process.env.COVERAGE_ENABLED === 'true'
			? {
					coverage: {
						enabled: true,
						provider: 'v8',
						reporter: process.env.CI === 'true' ? ['cobertura'] : ['text-summary'],
						all: true,
					},
				}
			: {}),
	},
});
