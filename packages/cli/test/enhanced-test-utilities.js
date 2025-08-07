'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EnhancedTestSetup =
	exports.NetworkTestUtils =
	exports.FileSystemTestUtils =
	exports.DatabaseTestUtils =
	exports.AuthTestUtils =
	exports.NodeTypeTestUtils =
	exports.TestContainerUtils =
		void 0;
const di_1 = require('@n8n/di');
const config_1 = require('@n8n/config');
const backend_common_1 = require('@n8n/backend-common');
const jest_mock_extended_1 = require('jest-mock-extended');
class TestContainerUtils {
	static setup() {
		this.originalContainer = di_1.Container;
		this.setupDefaultMocks();
	}
	static teardown() {
		this.mockInstances.clear();
	}
	static getMockInstance(token) {
		if (!this.mockInstances.has(token)) {
			this.mockInstances.set(token, (0, jest_mock_extended_1.mock)());
		}
		return this.mockInstances.get(token);
	}
	static setupDefaultMocks() {
		const globalConfigMock = (0, jest_mock_extended_1.mock)();
		globalConfigMock.database = {
			type: 'sqlite',
			tablePrefix: '',
			logging: false,
		};
		this.mockInstances.set(config_1.GlobalConfig, globalConfigMock);
		const loggerMock = (0, jest_mock_extended_1.mock)();
		loggerMock.verbose.mockImplementation(() => {});
		loggerMock.debug.mockImplementation(() => {});
		loggerMock.info.mockImplementation(() => {});
		loggerMock.warn.mockImplementation(() => {});
		loggerMock.error.mockImplementation(() => {});
		this.mockInstances.set(backend_common_1.Logger, loggerMock);
	}
}
exports.TestContainerUtils = TestContainerUtils;
TestContainerUtils.mockInstances = new Map();
class NodeTypeTestUtils {
	static createMockNodeTypeDescription(overrides = {}) {
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
	static createMockNodeType(description) {
		const mockNodeType = (0, jest_mock_extended_1.mock)();
		mockNodeType.description = this.createMockNodeTypeDescription(description);
		mockNodeType.execute = jest.fn().mockResolvedValue([[{ json: { success: true } }]]);
		return mockNodeType;
	}
}
exports.NodeTypeTestUtils = NodeTypeTestUtils;
class AuthTestUtils {
	static createMockUser(overrides = {}) {
		return (0, jest_mock_extended_1.mock)({
			id: 'test-user-id',
			email: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			globalRoleId: 'global-role-id',
			...overrides,
		});
	}
	static createMockAuthenticatedRequest(user) {
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
exports.AuthTestUtils = AuthTestUtils;
class DatabaseTestUtils {
	static setupTestDatabase() {
		process.env.DB_TYPE = 'sqlite';
		process.env.DB_SQLITE_DATABASE = ':memory:';
		process.env.DB_LOGGING_ENABLED = 'false';
		process.env.DB_SQLITE_POOL_SIZE = '1';
	}
	static cleanupTestDatabase() {}
}
exports.DatabaseTestUtils = DatabaseTestUtils;
class FileSystemTestUtils {
	static mockFileOperations() {
		const fs = require('fs/promises');
		fs.readFile = jest.fn().mockImplementation((path) => {
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
exports.FileSystemTestUtils = FileSystemTestUtils;
class NetworkTestUtils {
	static mockNetworkDependencies() {
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
exports.NetworkTestUtils = NetworkTestUtils;
class EnhancedTestSetup {
	static setupTestEnvironment() {
		TestContainerUtils.setup();
		DatabaseTestUtils.setupTestDatabase();
		FileSystemTestUtils.mockFileOperations();
		NetworkTestUtils.mockNetworkDependencies();
	}
	static teardownTestEnvironment() {
		TestContainerUtils.teardown();
		DatabaseTestUtils.cleanupTestDatabase();
		jest.clearAllMocks();
		jest.resetModules();
	}
}
exports.EnhancedTestSetup = EnhancedTestSetup;
beforeEach(() => {
	EnhancedTestSetup.setupTestEnvironment();
});
afterEach(() => {
	EnhancedTestSetup.teardownTestEnvironment();
});
//# sourceMappingURL=enhanced-test-utilities.js.map
