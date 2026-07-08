import { NodeTestHarness } from '@nodes-testing/node-test-harness';

// Reads a real fixture file (nodes/Crypto/test/fixtures/binary.data, content "test") rather
// than mocking fast-glob/fs. The hardened file-system helper performs additional filesystem
// operations (symlink checks, directory pinning) that a partial fs mock cannot satisfy.
describe('Test Crypto Node', () => {
	new NodeTestHarness().setupTests();
});
