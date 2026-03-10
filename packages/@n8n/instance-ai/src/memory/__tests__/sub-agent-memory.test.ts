import { createSubAgentMemory, subAgentResourceId } from '../sub-agent-memory';
import { BUILDER_MEMORY_TEMPLATE, DEBUGGER_MEMORY_TEMPLATE } from '../sub-agent-memory-templates';

// Mock Mastra dependencies to avoid real database connections.
// jest.mock is hoisted, so we use jest.fn() inline and extract references below.

jest.mock('@mastra/memory', () => ({ Memory: jest.fn() }));
jest.mock('@mastra/pg', () => ({ PostgresStore: jest.fn() }));
jest.mock('@mastra/libsql', () => ({ LibSQLStore: jest.fn() }));

interface MemoryConfig {
	storage: unknown;
	options: {
		lastMessages: number;
		semanticRecall: boolean;
		workingMemory: { enabled: boolean; template: string };
	};
}

interface StoreConfig {
	id: string;
	connectionString?: string;
	url?: string;
}

// Extract mock references after jest.mock hoisting
const { Memory: MockMemory } = jest.requireMock<{ Memory: jest.Mock<unknown, [MemoryConfig]> }>(
	'@mastra/memory',
);
const { PostgresStore: MockPostgres } = jest.requireMock<{
	PostgresStore: jest.Mock<unknown, [StoreConfig]>;
}>('@mastra/pg');
const { LibSQLStore: MockLibSQL } = jest.requireMock<{
	LibSQLStore: jest.Mock<unknown, [StoreConfig]>;
}>('@mastra/libsql');

beforeEach(() => {
	MockMemory.mockClear();
	MockPostgres.mockClear();
	MockLibSQL.mockClear();
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

describe('createSubAgentMemory', () => {
	it('returns Memory instance for memory-enabled roles', () => {
		expect(createSubAgentMemory('postgresql://test', 'workflow-builder')).toBeDefined();
	});

	it('returns undefined for non-memory-enabled roles', () => {
		expect(createSubAgentMemory('postgresql://test', 'random-role')).toBeUndefined();
	});

	it('uses PostgresStore for postgresql URLs', () => {
		createSubAgentMemory('postgresql://localhost:5432/test', 'workflow-builder');
		expect(MockPostgres).toHaveBeenCalledTimes(1);
		expect(MockPostgres.mock.calls[0][0].connectionString).toBe('postgresql://localhost:5432/test');
	});

	it('uses LibSQLStore for non-postgresql URLs', () => {
		createSubAgentMemory('file:./test.db', 'workflow-builder');
		expect(MockLibSQL).toHaveBeenCalledTimes(1);
		expect(MockLibSQL.mock.calls[0][0].url).toBe('file:./test.db');
	});

	it('passes correct Memory config', () => {
		createSubAgentMemory('postgresql://test', 'workflow-builder');

		expect(MockMemory).toHaveBeenCalledTimes(1);
		const config = MockMemory.mock.calls[0][0];

		expect(config.options.lastMessages).toBe(0);
		expect(config.options.semanticRecall).toBe(false);
		expect(config.options.workingMemory.enabled).toBe(true);
		expect(config.options.workingMemory.template).toBe(BUILDER_MEMORY_TEMPLATE);
	});

	it('uses role-specific templates', () => {
		createSubAgentMemory('postgresql://test', 'workflow-builder');
		expect(MockMemory.mock.calls[0][0].options.workingMemory.template).toBe(
			BUILDER_MEMORY_TEMPLATE,
		);

		MockMemory.mockClear();
		createSubAgentMemory('postgresql://test', 'execution-debugger');
		expect(MockMemory.mock.calls[0][0].options.workingMemory.template).toBe(
			DEBUGGER_MEMORY_TEMPLATE,
		);
	});
});
