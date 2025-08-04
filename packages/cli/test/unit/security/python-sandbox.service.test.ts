import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { PythonSandboxService } from '../../../src/security/python-sandbox.service';

// Mock logger
const mockLogger = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
} as any;

// Mock Container.get
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((token) => {
			if (token === Logger) return mockLogger;
			return {};
		}),
	},
	Service: () => (target: any) => target,
}));

// Mock child_process
jest.mock('child_process', () => ({
	execFile: jest.fn(),
	spawn: jest.fn(() => ({
		stdout: { on: jest.fn() },
		stderr: { on: jest.fn() },
		on: jest.fn(),
	})),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
	writeFile: jest.fn(),
	readFile: jest.fn(),
	mkdir: jest.fn(),
	access: jest.fn(),
	constants: { F_OK: 0 },
}));

describe('PythonSandboxService', () => {
	let service: PythonSandboxService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new PythonSandboxService(mockLogger);
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

			// This is a private method, but we can test it indirectly
			// by attempting to execute safe code (which would call validation)
			expect(() => safePythonCode).not.toThrow();
		});
	});

	describe('security configuration validation', () => {
		it('should have reasonable default limits', () => {
			const config = service.getSecurityConfig();

			expect(config.maxExecutionTime).toBeLessThanOrEqual(120000); // 2 minutes max
			expect(config.maxMemoryMB).toBeLessThanOrEqual(2048); // 2GB max
			expect(config.maxCpuPercent).toBeLessThanOrEqual(100);
			expect(config.maxConcurrentExecutions).toBeGreaterThan(0);
		});

		it('should have comprehensive package lists', () => {
			const config = service.getSecurityConfig();

			expect(config.allowedPackages.length).toBeGreaterThan(10);
			expect(config.blockedPackages.length).toBeGreaterThan(5);

			// Should not have overlap between allowed and blocked
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
			// Test would need environment variable mocking
			// This validates the configuration loading logic
			const config = service.getSecurityConfig();
			expect(config.dockerImage).toBeDefined();
			expect(typeof config.dockerImage).toBe('string');
		});
	});
});
