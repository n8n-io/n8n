/**
 * Vitest setup file for mcp/core tests
 * Cleans up mocks between tests to ensure test isolation
 */

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});
