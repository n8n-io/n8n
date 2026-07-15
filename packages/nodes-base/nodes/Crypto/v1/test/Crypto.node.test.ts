import { NodeTestHarness } from '@n8n/node-test-harness';

// Reads a real fixture file (nodes/Crypto/v1/test/fixtures/binary.data, content "test") rather
// than mocking fast-glob/fs: NodeTestHarness loads the node from dist via require(), where
// vi.mock can't intercept those modules.
describe('Test Crypto Node', () => {
	new NodeTestHarness().setupTests();
});
