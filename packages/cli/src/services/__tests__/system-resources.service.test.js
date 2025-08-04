'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const node_fs_1 = require('node:fs');
const node_os_1 = require('node:os');
const system_resources_service_1 = require('../system-resources.service');
jest.mock('node:os');
jest.mock('node:fs');
jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	LoggerProxy: {
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
	ApplicationError: jest.requireActual('n8n-workflow').ApplicationError,
}));
const mockedCpus = node_os_1.cpus;
const mockedFreemem = node_os_1.freemem;
const mockedTotalmem = node_os_1.totalmem;
const mockedLoadavg = node_os_1.loadavg;
const mockedFs = node_fs_1.promises;
describe('SystemResourcesService', () => {
	let service;
	beforeEach(() => {
		service = new system_resources_service_1.SystemResourcesService();
		mockedCpus.mockReturnValue([{}, {}, {}, {}]);
		mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
		mockedFreemem.mockReturnValue(8 * 1024 * 1024 * 1024);
		mockedLoadavg.mockReturnValue([1.2, 1.5, 1.8]);
		Object.defineProperty(process, 'pid', { value: 12345 });
		Object.defineProperty(process, 'uptime', { value: jest.fn(() => 3600) });
		Object.defineProperty(process, 'cpuUsage', {
			value: jest.fn(() => ({ user: 1000000, system: 500000 })),
		});
		Object.defineProperty(process, 'memoryUsage', {
			value: jest.fn(() => ({
				rss: 128 * 1024 * 1024,
				heapTotal: 64 * 1024 * 1024,
				heapUsed: 32 * 1024 * 1024,
				external: 16 * 1024 * 1024,
				arrayBuffers: 8 * 1024 * 1024,
			})),
		});
		mockedFs.stat.mockResolvedValue({});
		jest.clearAllMocks();
	});
	describe('getCurrentResources', () => {
		it('should return system resources with default options', async () => {
			const result = await service.getCurrentResources();
			expect(result).toMatchObject({
				timestamp: expect.any(String),
				system: {
					cpu: {
						usage: expect.any(Number),
						cores: 4,
						load: [1.2, 1.5, 1.8],
					},
					memory: {
						total: 16 * 1024 * 1024 * 1024,
						used: 8 * 1024 * 1024 * 1024,
						free: 8 * 1024 * 1024 * 1024,
						usagePercent: 50,
					},
					disk: {
						total: expect.any(Number),
						used: expect.any(Number),
						free: expect.any(Number),
						usagePercent: expect.any(Number),
					},
				},
				processes: {
					main: {
						pid: 12345,
						memory: 128 * 1024 * 1024,
						cpu: expect.any(Number),
						uptime: 3600000,
					},
				},
			});
			expect(result.processes.workers).toBeUndefined();
			expect(result.queue).toBeUndefined();
		});
		it('should include workers when requested', async () => {
			const result = await service.getCurrentResources({
				includeWorkers: true,
			});
			expect(result.processes.workers).toBeUndefined();
		});
		it('should include queue stats when requested', async () => {
			const result = await service.getCurrentResources({
				includeQueue: true,
			});
			expect(result.queue).toEqual({
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
			});
		});
		it('should handle all options enabled', async () => {
			const result = await service.getCurrentResources({
				includeWorkers: true,
				includeQueue: true,
			});
			expect(result.timestamp).toBeDefined();
			expect(result.system).toBeDefined();
			expect(result.processes).toBeDefined();
			expect(result.queue).toBeDefined();
		});
		it('should handle errors gracefully', async () => {
			mockedTotalmem.mockImplementation(() => {
				throw new Error('System error');
			});
			await expect(service.getCurrentResources()).rejects.toThrow('Failed to get system resources');
		});
	});
	describe('getCpuUsage', () => {
		it('should calculate CPU usage correctly', async () => {
			const serviceAny = service;
			let callCount = 0;
			const mockCpuUsage = jest.fn(() => {
				callCount++;
				if (callCount === 1) {
					return { user: 1000000, system: 500000 };
				} else {
					return { user: 2000000, system: 1000000 };
				}
			});
			Object.defineProperty(process, 'cpuUsage', { value: mockCpuUsage });
			const usage = await serviceAny.getCpuUsage();
			expect(typeof usage).toBe('number');
			expect(usage).toBeGreaterThanOrEqual(0);
			expect(usage).toBeLessThanOrEqual(100);
		});
		it('should cap CPU usage at 100%', async () => {
			const serviceAny = service;
			const mockCpuUsage = jest
				.fn()
				.mockReturnValueOnce({ user: 1000000, system: 500000 })
				.mockReturnValueOnce({ user: 100000000, system: 100000000 });
			Object.defineProperty(process, 'cpuUsage', { value: mockCpuUsage });
			const usage = await serviceAny.getCpuUsage();
			expect(usage).toBeLessThanOrEqual(100);
		});
	});
	describe('getDiskUsage', () => {
		it('should return placeholder disk usage on Unix systems', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			const serviceAny = service;
			const diskUsage = await serviceAny.getDiskUsage();
			expect(diskUsage).toEqual({
				total: 100 * 1024 * 1024 * 1024,
				used: 50 * 1024 * 1024 * 1024,
				free: 50 * 1024 * 1024 * 1024,
				usagePercent: 50,
			});
		});
		it('should return placeholder disk usage on Windows', async () => {
			Object.defineProperty(process, 'platform', { value: 'win32' });
			const serviceAny = service;
			const diskUsage = await serviceAny.getDiskUsage();
			expect(diskUsage).toEqual({
				total: 100 * 1024 * 1024 * 1024,
				used: 50 * 1024 * 1024 * 1024,
				free: 50 * 1024 * 1024 * 1024,
				usagePercent: 50,
			});
		});
		it('should handle errors and return zero values', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux' });
			mockedFs.stat.mockRejectedValue(new Error('Permission denied'));
			const serviceAny = service;
			const diskUsage = await serviceAny.getDiskUsage();
			expect(diskUsage).toEqual({
				total: 0,
				used: 0,
				free: 0,
				usagePercent: 0,
			});
		});
	});
	describe('getMainProcessStats', () => {
		it('should return current process statistics', async () => {
			const serviceAny = service;
			const stats = await serviceAny.getMainProcessStats();
			expect(stats).toEqual({
				pid: 12345,
				memory: 128 * 1024 * 1024,
				cpu: expect.any(Number),
				uptime: 3600000,
			});
			expect(stats.cpu).toBeGreaterThanOrEqual(0);
			expect(stats.cpu).toBeLessThanOrEqual(100);
		});
	});
	describe('checkSystemHealth', () => {
		it('should return healthy status for normal resources', async () => {
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(true);
			expect(result.issues).toEqual([]);
			expect(result.recommendations).toEqual([]);
		});
		it('should detect high CPU usage', async () => {
			const serviceAny = service;
			serviceAny.getCpuUsage = jest.fn().mockResolvedValue(85);
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('High CPU usage: 85.0%');
			expect(result.recommendations).toContain(
				'Consider scaling horizontally or optimizing CPU-intensive workflows',
			);
		});
		it('should detect high memory usage', async () => {
			mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
			mockedFreemem.mockReturnValue(2 * 1024 * 1024 * 1024);
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues.some((issue) => issue.includes('High memory usage'))).toBe(true);
			expect(result.recommendations.some((rec) => rec.includes('increasing system memory'))).toBe(
				true,
			);
		});
		it('should detect high disk usage', async () => {
			const serviceAny = service;
			serviceAny.getDiskUsage = jest.fn().mockResolvedValue({
				total: 100 * 1024 * 1024 * 1024,
				used: 95 * 1024 * 1024 * 1024,
				free: 5 * 1024 * 1024 * 1024,
				usagePercent: 95,
			});
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('High disk usage: 95.0%');
			expect(result.recommendations).toContain(
				'Clean up old execution data or increase storage capacity',
			);
		});
		it('should detect high system load', async () => {
			mockedLoadavg.mockReturnValue([8.5, 7.2, 6.8]);
			mockedCpus.mockReturnValue([{}, {}]);
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('High system load: 6.80 (cores: 2)');
			expect(result.recommendations).toContain(
				'System is under heavy load, consider reducing concurrent workflows',
			);
		});
		it('should detect multiple issues simultaneously', async () => {
			const serviceAny = service;
			serviceAny.getCpuUsage = jest.fn().mockResolvedValue(90);
			mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
			mockedFreemem.mockReturnValue(1 * 1024 * 1024 * 1024);
			serviceAny.getDiskUsage = jest.fn().mockResolvedValue({
				total: 100 * 1024 * 1024 * 1024,
				used: 92 * 1024 * 1024 * 1024,
				free: 8 * 1024 * 1024 * 1024,
				usagePercent: 92,
			});
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues.length).toBeGreaterThan(1);
			expect(result.recommendations.length).toBeGreaterThan(1);
		});
		it('should handle errors and return unhealthy status', async () => {
			const serviceAny = service;
			serviceAny.getCurrentResources = jest.fn().mockRejectedValue(new Error('System error'));
			const result = await service.checkSystemHealth();
			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('Failed to check system health');
			expect(result.recommendations).toContain('Check system monitoring configuration');
		});
	});
	describe('getResourceHistory', () => {
		it('should return empty array (placeholder implementation)', async () => {
			const result = await service.getResourceHistory('24h');
			expect(result).toEqual([]);
		});
	});
	describe('startResourceMonitoring', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});
		afterEach(() => {
			jest.useRealTimers();
		});
		it('should start periodic monitoring with default interval', async () => {
			const spy = jest.spyOn(service, 'getCurrentResources').mockResolvedValue({});
			service.startResourceMonitoring();
			expect(spy).not.toHaveBeenCalled();
			jest.advanceTimersByTime(30000);
			await Promise.resolve();
			expect(spy).toHaveBeenCalledWith({
				includeWorkers: true,
				includeQueue: true,
			});
		});
		it('should start periodic monitoring with custom interval', async () => {
			const spy = jest.spyOn(service, 'getCurrentResources').mockResolvedValue({});
			service.startResourceMonitoring(5000);
			jest.advanceTimersByTime(5000);
			await Promise.resolve();
			expect(spy).toHaveBeenCalled();
		});
		it('should handle errors during monitoring gracefully', async () => {
			jest.spyOn(service, 'getCurrentResources').mockRejectedValue(new Error('Monitor error'));
			expect(() => {
				service.startResourceMonitoring(1000);
				jest.advanceTimersByTime(1000);
			}).not.toThrow();
		});
	});
});
//# sourceMappingURL=system-resources.service.test.js.map
