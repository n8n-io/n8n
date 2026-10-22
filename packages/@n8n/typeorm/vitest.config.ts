import { defineConfig } from 'vitest/config';

// test/ holds the vendored mocha suite, which also has *.test.ts files.
export default defineConfig({
	test: { include: ['src/**/__tests__/**/*.test.ts'] },
});
