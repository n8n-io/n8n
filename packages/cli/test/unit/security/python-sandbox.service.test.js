'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const python_sandbox_service_1 = require('../../../src/security/python-sandbox.service');
const mockLogger = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((token) => {
			if (token === backend_common_1.Logger) return mockLogger;
			return {};
		}),
	},
	Service: () => (target) => target,
}));
jest.mock('child_process', () => ({
	execFile: jest.fn(),
	spawn: jest.fn(() => ({
		stdout: { on: jest.fn() },
		stderr: { on: jest.fn() },
		on: jest.fn(),
	})),
}));
jest.mock('fs/promises', () => ({
	writeFile: jest.fn(),
	readFile: jest.fn(),
	mkdir: jest.fn(),
	access: jest.fn(),
	constants: { F_OK: 0 },
}));
describe('PythonSandboxService', () => {
	let service;
	beforeEach(() => {
		jest.clearAllMocks();
		service = new python_sandbox_service_1.PythonSandboxService(mockLogger);
	});
	describe('getSecurityConfig', () => {
		it('should return security configuration', () => {
			const config = service.getSecurityConfig();
			expect(config).toBeDefined();
			expect(config.maxExecutionTime).toBeGreaterThan(0);
			expect(config.maxMemoryMB).toBeGreaterThan(0);
			expect(config.allowedPackages).toBeInstanceOf(Array);
			expect(config.blockedPackages).toBeInstanceOf(Array);
		});
		it('should include expected security settings', () => {
			const config = service.getSecurityConfig();
			expect(config.allowedPackages).toContain('numpy');
			expect(config.allowedPackages).toContain('pandas');
			expect(config.blockedPackages).toContain('subprocess32');
			expect(config.blockedPackages).toContain('psutil');
		});
	});
	describe('getAuditLogs', () => {
		it('should return empty audit logs initially', () => {
			const logs = service.getAuditLogs();
			expect(logs).toEqual([]);
		});
	});
	describe('validateCodeSecurity', () => {
		it('should validate safe code without throwing', async () => {
			const safePythonCode = `
import numpy as np
data = [1, 2, 3, 4, 5]
result = np.mean(data)
print(f"Mean: {result}")
			`;
			expect(() => safePythonCode).not.toThrow();
		});
	});
	describe('security configuration validation', () => {
		it('should have reasonable default limits', () => {
			const config = service.getSecurityConfig();
			expect(config.maxExecutionTime).toBeLessThanOrEqual(120000);
			expect(config.maxMemoryMB).toBeLessThanOrEqual(2048);
			expect(config.maxCpuPercent).toBeLessThanOrEqual(100);
			expect(config.maxConcurrentExecutions).toBeGreaterThan(0);
		});
		it('should have comprehensive package lists', () => {
			const config = service.getSecurityConfig();
			expect(config.allowedPackages.length).toBeGreaterThan(10);
			expect(config.blockedPackages.length).toBeGreaterThan(5);
			const overlap = config.allowedPackages.filter((pkg) => config.blockedPackages.includes(pkg));
			expect(overlap).toEqual([]);
		});
		it('should have secure file system restrictions', () => {
			const config = service.getSecurityConfig();
			expect(config.fileSystemAccess.allowRead).toContain('/workspace');
			expect(config.fileSystemAccess.allowWrite).toContain('/workspace');
			expect(config.fileSystemAccess.blocked).toContain('/etc');
			expect(config.fileSystemAccess.blocked).toContain('/root');
		});
	});
	describe('environment configuration', () => {
		it('should respect environment variables', () => {
			const config = service.getSecurityConfig();
			expect(config.dockerImage).toBeDefined();
			expect(typeof config.dockerImage).toBe('string');
		});
	});
});
//# sourceMappingURL=python-sandbox.service.test.js.map
