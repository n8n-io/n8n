/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Shared Mastra mocks for Jest. All @mastra/* packages ship ESM which Jest
 * can't parse through pnpm's symlinked node_modules. These mocks intercept
 * the imports before Jest tries to load the real files.
 */

jest.mock('@mastra/core', () => ({
	Mastra: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation(() => ({})),
}));

// Base class stubs for the checkpoint bridge
class MockStorageDomain {}
class MockWorkflowsStorage extends MockStorageDomain {}
class MockMastraCompositeStore {}

jest.mock('@mastra/core/storage', () => ({
	InMemoryStore: jest.fn().mockImplementation(() => ({ __isInMemoryStore: true })),
	StorageDomain: MockStorageDomain,
	WorkflowsStorage: MockWorkflowsStorage,
	MastraCompositeStore: MockMastraCompositeStore,
}));

jest.mock('@mastra/core/workflows', () => ({}));
