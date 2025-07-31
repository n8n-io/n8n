import { promises as fs } from 'node:fs';
import { cpus, freemem, totalmem, loadavg } from 'node:os';

import { SystemResourcesService } from '../system-resources.service';

// Mock Node.js modules
jest.mock('node:os');
jest.mock('node:fs');

// Mock logger
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

const mockedCpus = cpus as jest.MockedFunction<typeof cpus>;
const mockedFreemem = freemem as jest.MockedFunction<typeof freemem>;
const mockedTotalmem = totalmem as jest.MockedFunction<typeof totalmem>;
const mockedLoadavg = loadavg as jest.MockedFunction<typeof loadavg>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('SystemResourcesService', () => {
	let service: SystemResourcesService;

	beforeEach(() => {
		service = new SystemResourcesService();

		// Setup default mocks
		mockedCpus.mockReturnValue([
			{} as any,
			{} as any,
			{} as any,
			{} as any, // 4 CPUs
		]);
		mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
		mockedFreemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free
		mockedLoadavg.mockReturnValue([1.2, 1.5, 1.8]);

		// Mock process properties
		Object.defineProperty(process, 'pid', { value: 12345 });
		Object.defineProperty(process, 'uptime', { value: jest.fn(() => 3600) }); // 1 hour
		Object.defineProperty(process, 'cpuUsage', {
			value: jest.fn(() => ({ user: 1000000, system: 500000 })), // 1.5 seconds total
		});
		Object.defineProperty(process, 'memoryUsage', {
			value: jest.fn(() => ({
				rss: 128 * 1024 * 1024, // 128MB
				heapTotal: 64 * 1024 * 1024,
				heapUsed: 32 * 1024 * 1024,
				external: 16 * 1024 * 1024,
				arrayBuffers: 8 * 1024 * 1024,
			})),
		});

		// Mock fs.stat for disk usage
		mockedFs.stat.mockResolvedValue({} as any);

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
						uptime: 3600000, // Converted to milliseconds
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

			expect(result.processes.workers).toBeUndefined(); // No workers in test environment
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
			// Mock an error in one of the system calls
			mockedTotalmem.mockImplementation(() => {
				throw new Error('System error');
			});

			await expect(service.getCurrentResources()).rejects.toThrow('Failed to get system resources');
		});
	});

	describe('getCpuUsage', () => {
		it('should calculate CPU usage correctly', async () => {
			// Access private method for testing
			const serviceAny = service as any;

			// Mock process.cpuUsage to return different values on subsequent calls
			let callCount = 0;
			const mockCpuUsage = jest.fn(() => {
				callCount++;
				if (callCount === 1) {
					return { user: 1000000, system: 500000 }; // Initial call
				} else {
					return { user: 2000000, system: 1000000 }; // Delta calculation
				}
			});

			Object.defineProperty(process, 'cpuUsage', { value: mockCpuUsage });

			const usage = await serviceAny.getCpuUsage();

			expect(typeof usage).toBe('number');
			expect(usage).toBeGreaterThanOrEqual(0);
			expect(usage).toBeLessThanOrEqual(100);
		});

		it('should cap CPU usage at 100%', async () => {
			const serviceAny = service as any;

			// Mock very high CPU usage
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

			const serviceAny = service as any;
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

			const serviceAny = service as any;
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

			const serviceAny = service as any;
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
			const serviceAny = service as any;
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
			// Mock high CPU usage
			const serviceAny = service as any;
			serviceAny.getCpuUsage = jest.fn().mockResolvedValue(85);

			const result = await service.checkSystemHealth();

			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('High CPU usage: 85.0%');
			expect(result.recommendations).toContain(
				'Consider scaling horizontally or optimizing CPU-intensive workflows',
			);
		});

		it('should detect high memory usage', async () => {
			// Mock high memory usage
			mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
			mockedFreemem.mockReturnValue(2 * 1024 * 1024 * 1024); // 2GB free (87.5% used)

			const result = await service.checkSystemHealth();

			expect(result.healthy).toBe(false);
			expect(result.issues.some((issue) => issue.includes('High memory usage'))).toBe(true);
			expect(result.recommendations.some((rec) => rec.includes('increasing system memory'))).toBe(
				true,
			);
		});

		it('should detect high disk usage', async () => {
			// Mock high disk usage
			const serviceAny = service as any;
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
			// Mock high load average
			mockedLoadavg.mockReturnValue([8.5, 7.2, 6.8]); // High 15-min load
			mockedCpus.mockReturnValue([{}, {}] as any); // 2 CPUs

			const result = await service.checkSystemHealth();

			expect(result.healthy).toBe(false);
			expect(result.issues).toContain('High system load: 6.80 (cores: 2)');
			expect(result.recommendations).toContain(
				'System is under heavy load, consider reducing concurrent workflows',
			);
		});

		it('should detect multiple issues simultaneously', async () => {
			// Mock multiple high resource usage
			const serviceAny = service as any;
			serviceAny.getCpuUsage = jest.fn().mockResolvedValue(90);
			mockedTotalmem.mockReturnValue(16 * 1024 * 1024 * 1024);
			mockedFreemem.mockReturnValue(1 * 1024 * 1024 * 1024); // 93.75% used
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
			// Mock system resource error
			const serviceAny = service as any;
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
			const spy = jest.spyOn(service, 'getCurrentResources').mockResolvedValue({} as any);

			service.startResourceMonitoring();

			expect(spy).not.toHaveBeenCalled();

			// Fast-forward 30 seconds (default interval)
			jest.advanceTimersByTime(30000);

			await Promise.resolve(); // Allow async operations to complete

			expect(spy).toHaveBeenCalledWith({
				includeWorkers: true,
				includeQueue: true,
			});
		});

		it('should start periodic monitoring with custom interval', async () => {
			const spy = jest.spyOn(service, 'getCurrentResources').mockResolvedValue({} as any);

			service.startResourceMonitoring(5000); // 5 seconds

			// Fast-forward 5 seconds
			jest.advanceTimersByTime(5000);

			await Promise.resolve();

			expect(spy).toHaveBeenCalled();
		});

		it('should handle errors during monitoring gracefully', async () => {
			jest.spyOn(service, 'getCurrentResources').mockRejectedValue(new Error('Monitor error'));

			// Should not throw when monitoring fails
			expect(() => {
				service.startResourceMonitoring(1000);
				jest.advanceTimersByTime(1000);
			}).not.toThrow();
		});
	});
});
