import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		silent: true,
		globals: true,
		environment: 'jsdom',
		coverage: {
			enabled: false,
			provider: 'v8',
			reporter: ['text-summary', 'lcov', 'html-spa'],
		},
	},
});
