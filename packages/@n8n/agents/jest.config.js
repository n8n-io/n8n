/** @type {import('jest').Config} */
const base = require('../../../jest.config');

module.exports = {
	...base,
	// Shared mocks for @mastra/* ESM packages that Jest can't parse
	// through pnpm's symlinked node_modules
	setupFiles: ['./src/__tests__/setup-mastra-mocks.ts'],
	// Integration tests use Vitest (pnpm test:integration), exclude from Jest
	testPathIgnorePatterns: [...(base.testPathIgnorePatterns || []), '/integration/'],
};
