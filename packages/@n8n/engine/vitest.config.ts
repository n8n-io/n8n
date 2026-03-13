import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/__tests__/**/*.test.ts', 'test/**/*.test.ts'],
		setupFiles: ['./test/setup.ts'],
		testTimeout: 30_000,
		// Integration tests share a PostgreSQL database — run files sequentially
		// to prevent dropSchema race conditions between test files
		fileParallelism: false,
	},
});
