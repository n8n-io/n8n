/**
 * Jest setup file for mcp/core tests
 * Cleans up mocks between tests to ensure test isolation
 */

beforeEach(() => {
	jest.clearAllMocks();
});

afterEach(() => {
	jest.restoreAllMocks();
});
