import type { MastraCompositeStore } from '@mastra/core/storage';

import { createSubAgentMemory, subAgentResourceId } from '../sub-agent-memory';
import { BUILDER_MEMORY_TEMPLATE, DEBUGGER_MEMORY_TEMPLATE } from '../sub-agent-memory-templates';

// Mock Mastra dependencies to avoid real database connections.
jest.mock('@mastra/memory', () => ({ Memory: jest.fn() }));

interface MemoryConfig {
	storage: unknown;
	options: {
		lastMessages: number;
		semanticRecall: boolean;
		workingMemory: { enabled: boolean; template: string };
	};
}

// Extract mock references after jest.mock hoisting
const { Memory: MockMemory } = jest.requireMock<{ Memory: jest.Mock<unknown, [MemoryConfig]> }>(
	'@mastra/memory',
);

beforeEach(() => {
	MockMemory.mockClear();
});

describe('subAgentResourceId', () => {
	it('combines userId and role with colon separator', () => {
		expect(subAgentResourceId('user-123', 'workflow-builder')).toBe('user-123:workflow-builder');
	});

	it('handles different roles', () => {
		expect(subAgentResourceId('u1', 'execution-debugger')).toBe('u1:execution-debugger');
		expect(subAgentResourceId('u1', 'data-table-manager')).toBe('u1:data-table-manager');
	});
});

const mockStorage = { id: 'test-storage' } as unknown as MastraCompositeStore;

describe('createSubAgentMemory', () => {
	it('returns Memory instance for memory-enabled roles', () => {
		expect(createSubAgentMemory(mockStorage, 'workflow-builder')).toBeDefined();
	});

	it('returns undefined for non-memory-enabled roles', () => {
		expect(createSubAgentMemory(mockStorage, 'random-role')).toBeUndefined();
	});

	it('passes the provided storage directly to Memory', () => {
		createSubAgentMemory(mockStorage, 'workflow-builder');
		expect(MockMemory).toHaveBeenCalledTimes(1);
		expect(MockMemory.mock.calls[0][0].storage).toBe(mockStorage);
	});

	it('passes correct Memory config', () => {
		createSubAgentMemory(mockStorage, 'workflow-builder');

		expect(MockMemory).toHaveBeenCalledTimes(1);
		const config = MockMemory.mock.calls[0][0];

		expect(config.options.lastMessages).toBe(0);
		expect(config.options.semanticRecall).toBe(false);
		expect(config.options.workingMemory.enabled).toBe(true);
		expect(config.options.workingMemory.template).toBe(BUILDER_MEMORY_TEMPLATE);
	});

	it('uses role-specific templates', () => {
		createSubAgentMemory(mockStorage, 'workflow-builder');
		expect(MockMemory.mock.calls[0][0].options.workingMemory.template).toBe(
			BUILDER_MEMORY_TEMPLATE,
		);

		MockMemory.mockClear();
		createSubAgentMemory(mockStorage, 'execution-debugger');
		expect(MockMemory.mock.calls[0][0].options.workingMemory.template).toBe(
			DEBUGGER_MEMORY_TEMPLATE,
		);
	});
});
