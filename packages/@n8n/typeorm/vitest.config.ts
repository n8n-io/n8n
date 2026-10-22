import { createVitestConfig } from '@n8n/vitest-config/node';

// test/ holds the vendored mocha suite, which also has *.test.ts files.
export default createVitestConfig({
	include: ['src/**/__tests__/**/*.test.ts'],
});
