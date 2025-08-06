/**
 * Enhanced Test Utilities for n8n CLI Package
 *
 * This module provides comprehensive test utilities for mocking dependencies,
 * setting up test environments, and handling complex integration scenarios.
 */

import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

/**
 * Enhanced DI Container utilities for tests
 */
export class TestContainerUtils {
	private static originalContainer: typeof Container;
	private static mockInstances = new Map<any, MockProxy<any>>();

	/**
	 * Initialize test container with proper mocking
	 */
	static setup(): void {
		this.originalContainer = Container;
		this.setupDefaultMocks();
	}

	/**
	 * Reset container to original state
	 */
	static teardown(): void {
		this.mockInstances.clear();
		// Reset container bindings if needed
	}

	/**
	 * Get or create a mock instance for a service
	 */
	static getMockInstance<T>(token: new (...args: any[]) => T): MockProxy<T> {
		if (!this.mockInstances.has(token)) {
			this.mockInstances.set(token, mock<T>());
		}
		return this.mockInstances.get(token) as MockProxy<T>;
	}

	/**
	 * Setup commonly used service mocks
	 */
	private static setupDefaultMocks(): void {
		// Mock GlobalConfig
		const globalConfigMock = mock<GlobalConfig>();
		globalConfigMock.database = {
			type: 'sqlite' as any,
			tablePrefix: '',
			logging: false,
		} as any;
		this.mockInstances.set(GlobalConfig, globalConfigMock);

		// Mock Logger
		const loggerMock = mock<Logger>();
		loggerMock.verbose.mockImplementation(() => {});
		loggerMock.debug.mockImplementation(() => {});
		loggerMock.info.mockImplementation(() => {});
		loggerMock.warn.mockImplementation(() => {});
		loggerMock.error.mockImplementation(() => {});
		this.mockInstances.set(Logger, loggerMock);
	}
}

/**
 * Node type testing utilities
 */
export class NodeTypeTestUtils {
	/**
	 * Create a mock node type description
	 */
	static createMockNodeTypeDescription(
		overrides: Partial<INodeTypeDescription> = {},
	): INodeTypeDescription {
		return {
			displayName: 'Test Node',
			name: 'n8n-nodes-base.TestNode',
			group: ['test'],
			version: 1,
			description: 'Test node for testing purposes',
			defaults: {
				name: 'Test Node',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			...overrides,
		};
	}

	/**
	 * Create a mock node type implementation
	 */
	static createMockNodeType(description?: Partial<INodeTypeDescription>): MockProxy<INodeType> {
		const mockNodeType = mock<INodeType>();
		mockNodeType.description = this.createMockNodeTypeDescription(description);
		mockNodeType.execute = jest.fn().mockResolvedValue([[{ json: { success: true } }]]);
		return mockNodeType;
	}
}

/**
 * User and authentication test utilities
 */
export class AuthTestUtils {
	/**
	 * Create a mock user for testing
	 */
	static createMockUser(overrides: Partial<User> = {}): MockProxy<User> {
		return mock<User>({
			id: 'test-user-id',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			globalRoleId: 'global-role-id',
			...overrides,
		});
	}

	/**
	 * Create a mock authenticated request
	 */
	static createMockAuthenticatedRequest(user?: Partial<User>) {
		return {
			user: this.createMockUser(user),
			headers: {
				'x-n8n-user-id': user?.id || 'test-user-id',
			},
			body: {},
			params: {},
			query: {},
		};
	}
}

/**
 * Database testing utilities
 */
export class DatabaseTestUtils {
	/**
	 * Setup test database environment variables
	 */
	static setupTestDatabase(): void {
		process.env.DB_TYPE = 'sqlite';
		process.env.DB_SQLITE_DATABASE = ':memory:';
		process.env.DB_LOGGING_ENABLED = 'false';
		process.env.DB_SQLITE_POOL_SIZE = '1';
	}

	/**
	 * Clean up database environment
	 */
	static cleanupTestDatabase(): void {
		// Cleanup logic if needed
	}
}

/**
 * File system testing utilities
 */
export class FileSystemTestUtils {
	/**
	 * Mock file system operations with common scenarios
	 */
	static mockFileOperations(): void {
		const fs = require('fs/promises');

		// Mock common file operations
		fs.readFile = jest.fn().mockImplementation((path: string) => {
			if (path.includes('translations')) {
				return Promise.resolve('{}');
			}
			if (path.includes('package.json')) {
				return Promise.resolve('{"name": "test-package", "version": "1.0.0"}');
			}
			return Promise.resolve('test file content');
		});

		fs.writeFile = jest.fn().mockResolvedValue(undefined);
		fs.access = jest.fn().mockResolvedValue(undefined);
		fs.stat = jest.fn().mockResolvedValue({
			isDirectory: () => false,
			isFile: () => true,
			size: 1024,
			mtime: new Date(),
		});
		fs.mkdir = jest.fn().mockResolvedValue(undefined);
		fs.readdir = jest.fn().mockResolvedValue([]);
	}
}

/**
 * Network and HTTP testing utilities
 */
export class NetworkTestUtils {
	/**
	 * Setup network mocks for external dependencies
	 */
	static mockNetworkDependencies(): void {
		// Mock axios or other HTTP clients
		jest.mock('axios', () => ({
			create: jest.fn(() => ({
				get: jest.fn().mockResolvedValue({ data: {} }),
				post: jest.fn().mockResolvedValue({ data: {} }),
				put: jest.fn().mockResolvedValue({ data: {} }),
				delete: jest.fn().mockResolvedValue({ data: {} }),
			})),
			get: jest.fn().mockResolvedValue({ data: {} }),
			post: jest.fn().mockResolvedValue({ data: {} }),
		}));
	}
}

/**
 * Main test setup utility that configures all necessary mocks and utilities
 */
export class EnhancedTestSetup {
	/**
	 * Complete test environment setup
	 */
	static setupTestEnvironment(): void {
		TestContainerUtils.setup();
		DatabaseTestUtils.setupTestDatabase();
		FileSystemTestUtils.mockFileOperations();
		NetworkTestUtils.mockNetworkDependencies();
	}

	/**
	 * Clean up test environment
	 */
	static teardownTestEnvironment(): void {
		TestContainerUtils.teardown();
		DatabaseTestUtils.cleanupTestDatabase();
		jest.clearAllMocks();
		jest.resetModules();
	}
}

// Global setup for all tests
beforeEach(() => {
	EnhancedTestSetup.setupTestEnvironment();
});

afterEach(() => {
	EnhancedTestSetup.teardownTestEnvironment();
});
