import type { SystemResourcesDto } from '@n8n/api-types';
import { LoggerProxy, ApplicationError } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import { cpus, freemem, totalmem, loadavg } from 'node:os';
import { Service } from '@n8n/di';

interface SystemStats {
	cpu: {
		usage: number;
		cores: number;
		load: [number, number, number];
	};
	memory: {
		total: number;
		used: number;
		free: number;
		usagePercent: number;
	};
	disk: {
		total: number;
		used: number;
		free: number;
		usagePercent: number;
	};
}

interface ProcessStats {
	pid: number;
	memory: number;
	cpu: number;
	uptime: number;
}

@Service()
export class SystemResourcesService {
	private logger = LoggerProxy;

	private lastCpuUsage = process.cpuUsage();
	private lastTimestamp = Date.now();

	/**
	 * Get current system resources
	 */
	async getCurrentResources(
		options: {
			includeWorkers?: boolean;
			includeQueue?: boolean;
		} = {},
	): Promise<SystemResourcesDto> {
		try {
			const [systemStats, mainProcessStats, workerStats, queueStats] = await Promise.all([
				this.getSystemStats(),
				this.getMainProcessStats(),
				options.includeWorkers ? this.getWorkerProcessStats() : Promise.resolve(undefined),
				options.includeQueue ? this.getQueueStats() : Promise.resolve(undefined),
			]);

			return {
				timestamp: new Date().toISOString(),
				system: systemStats,
				processes: {
					main: mainProcessStats,
					...(workerStats && { workers: workerStats }),
				},
				...(queueStats && { queue: queueStats }),
			};
		} catch (error) {
			this.logger.error('Failed to get system resources', {
				error: error.message,
			});
			throw new ApplicationError('Failed to get system resources', {
				cause: error,
			});
		}
	}

	/**
	 * Get system-level statistics
	 */
	private async getSystemStats(): Promise<SystemStats> {
		const totalMemory = totalmem();
		const freeMemory = freemem();
		const usedMemory = totalMemory - freeMemory;

		// Get CPU usage (this is an approximation)
		const cpuUsage = await this.getCpuUsage();

		// Get load averages
		const loadAverages = loadavg();

		// Get disk usage (attempt to get root filesystem usage)
		const diskStats = await this.getDiskUsage();

		return {
			cpu: {
				usage: cpuUsage,
				cores: cpus().length,
				load: [loadAverages[0], loadAverages[1], loadAverages[2]],
			},
			memory: {
				total: totalMemory,
				used: usedMemory,
				free: freeMemory,
				usagePercent: (usedMemory / totalMemory) * 100,
			},
			disk: diskStats,
		};
	}

	/**
	 * Get CPU usage percentage
	 */
	private async getCpuUsage(): Promise<number> {
		return await new Promise((resolve) => {
			const currentUsage = process.cpuUsage(this.lastCpuUsage);
			const currentTimestamp = Date.now();

			const elapsedTime = (currentTimestamp - this.lastTimestamp) * 1000; // Convert to microseconds
			const totalCpuTime = currentUsage.user + currentUsage.system;

			// Calculate CPU usage percentage
			const cpuUsage = elapsedTime > 0 ? (totalCpuTime / elapsedTime) * 100 : 0;

			// Update for next calculation
			this.lastCpuUsage = process.cpuUsage();
			this.lastTimestamp = currentTimestamp;

			resolve(Math.min(100, cpuUsage)); // Cap at 100%
		});
	}

	/**
	 * Get disk usage statistics
	 */
	private async getDiskUsage(): Promise<{
		total: number;
		used: number;
		free: number;
		usagePercent: number;
	}> {
		try {
			// Try to get disk usage via statvfs (Unix-like systems)
			if (process.platform !== 'win32') {
				const stats = await fs.stat('/');
				// For Unix systems, we'll use a simple approximation
				// In a real implementation, you might want to use a native module
				// or execute `df` command for accurate disk usage
				return {
					total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
					used: 50 * 1024 * 1024 * 1024, // 50GB placeholder
					free: 50 * 1024 * 1024 * 1024, // 50GB placeholder
					usagePercent: 50, // 50% placeholder
				};
			} else {
				// Windows placeholder
				return {
					total: 100 * 1024 * 1024 * 1024,
					used: 50 * 1024 * 1024 * 1024,
					free: 50 * 1024 * 1024 * 1024,
					usagePercent: 50,
				};
			}
		} catch (error) {
			this.logger.warn('Failed to get disk usage statistics', {
				error: error.message,
			});

			// Return placeholder values on error
			return {
				total: 0,
				used: 0,
				free: 0,
				usagePercent: 0,
			};
		}
	}

	/**
	 * Get main process statistics
	 */
	private async getMainProcessStats(): Promise<ProcessStats> {
		const memoryUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();
		const uptime = process.uptime();

		// Calculate CPU usage for this process
		const processCpuUsage = ((cpuUsage.user + cpuUsage.system) / 1000000 / uptime) * 100;

		return {
			pid: process.pid,
			memory: memoryUsage.rss, // Resident Set Size
			cpu: Math.min(100, processCpuUsage), // Cap at 100%
			uptime: uptime * 1000, // Convert to milliseconds
		};
	}

	/**
	 * Get worker process statistics (if running in scaling mode)
	 */
	private async getWorkerProcessStats(): Promise<
		| Array<{
				pid: number;
				memory: number;
				cpu: number;
				type: 'worker' | 'task-runner';
		  }>
		| undefined
	> {
		try {
			// This is a placeholder implementation
			// In a real scaling setup, you would need to:
			// 1. Track worker process PIDs
			// 2. Query each worker for its stats
			// 3. Use process monitoring tools or APIs

			// For now, return empty array or undefined if no workers
			return undefined;
		} catch (error) {
			this.logger.warn('Failed to get worker process statistics', {
				error: error.message,
			});
			return undefined;
		}
	}

	/**
	 * Get queue statistics (if using Redis/Bull queues)
	 */
	private async getQueueStats(): Promise<
		| {
				waiting: number;
				active: number;
				completed: number;
				failed: number;
		  }
		| undefined
	> {
		try {
			// Attempt to get queue stats from scaling service
			// This depends on the specific queue implementation used by n8n

			// Check if we're in scaling mode and have access to queue
			// TODO: Implement proper scaling service integration
			// const scalingService = Container.get('ScalingService', false);
			// if (scalingService && typeof scalingService.getQueueStats === 'function') {
			//	return await scalingService.getQueueStats();
			// }

			// If no scaling service or queue, return basic stats
			return {
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
			};
		} catch (error) {
			this.logger.warn('Failed to get queue statistics', {
				error: error.message,
			});
			return undefined;
		}
	}

	/**
	 * Get system resource history over time
	 * This would typically be implemented with a time-series database
	 * or by storing periodic snapshots
	 */
	async getResourceHistory(timeRange: string): Promise<SystemResourcesDto[]> {
		// Placeholder implementation
		// In a real system, you would:
		// 1. Store periodic system resource snapshots
		// 2. Query historical data from database
		// 3. Return time series data

		this.logger.warn('Resource history not implemented yet', { timeRange });
		return [];
	}

	/**
	 * Start periodic resource monitoring (optional)
	 * This could be used to collect historical data
	 */
	startResourceMonitoring(intervalMs: number = 30000): void {
		setInterval(async () => {
			try {
				const resources = await this.getCurrentResources({
					includeWorkers: true,
					includeQueue: true,
				});

				// Here you would typically:
				// 1. Store the resource snapshot in a database
				// 2. Update metrics for monitoring systems
				// 3. Check for resource alerts/thresholds

				this.logger.debug('Resource monitoring snapshot', {
					timestamp: resources.timestamp,
					cpuUsage: resources.system.cpu.usage,
					memoryUsage: resources.system.memory.usagePercent,
					diskUsage: resources.system.disk.usagePercent,
				});
			} catch (error) {
				this.logger.error('Failed to collect resource monitoring snapshot', {
					error: error.message,
				});
			}
		}, intervalMs);
	}

	/**
	 * Check if system resources are healthy
	 */
	async checkSystemHealth(): Promise<{
		healthy: boolean;
		issues: string[];
		recommendations: string[];
	}> {
		try {
			const resources = await this.getCurrentResources();
			const issues: string[] = [];
			const recommendations: string[] = [];

			// Check CPU usage
			if (resources.system.cpu.usage > 80) {
				issues.push(`High CPU usage: ${resources.system.cpu.usage.toFixed(1)}%`);
				recommendations.push('Consider scaling horizontally or optimizing CPU-intensive workflows');
			}

			// Check memory usage
			if (resources.system.memory.usagePercent > 85) {
				issues.push(`High memory usage: ${resources.system.memory.usagePercent.toFixed(1)}%`);
				recommendations.push(
					'Consider increasing system memory or optimizing memory-intensive workflows',
				);
			}

			// Check disk usage
			if (resources.system.disk.usagePercent > 90) {
				issues.push(`High disk usage: ${resources.system.disk.usagePercent.toFixed(1)}%`);
				recommendations.push('Clean up old execution data or increase storage capacity');
			}

			// Check load average (Unix systems)
			const load15min = resources.system.cpu.load[2];
			const cpuCores = resources.system.cpu.cores;
			if (load15min > cpuCores * 1.5) {
				issues.push(`High system load: ${load15min.toFixed(2)} (cores: ${cpuCores})`);
				recommendations.push('System is under heavy load, consider reducing concurrent workflows');
			}

			return {
				healthy: issues.length === 0,
				issues,
				recommendations,
			};
		} catch (error) {
			this.logger.error('Failed to check system health', {
				error: error.message,
			});

			return {
				healthy: false,
				issues: ['Failed to check system health'],
				recommendations: ['Check system monitoring configuration'],
			};
		}
	}
}
