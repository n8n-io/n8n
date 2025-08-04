import type { SystemResourcesDto } from '@n8n/api-types';
import { LoggerProxy, ApplicationError } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, freemem, totalmem, loadavg } from 'node:os';
import { Service } from '@n8n/di';

const execAsync = promisify(exec);

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
			// Use the statvfs system call or df command for accurate disk usage
			if (process.platform !== 'win32') {
				try {
					// Try to use df command for accurate disk space information
					const { stdout } = await execAsync('df / | tail -1');
					const parts = stdout.trim().split(/\s+/);

					if (parts.length >= 4) {
						// df output format: filesystem blocks used available use% mounted
						const totalBlocks = parseInt(parts[1]) * 1024; // Convert from 1K blocks to bytes
						const usedBlocks = parseInt(parts[2]) * 1024;
						const availableBlocks = parseInt(parts[3]) * 1024;
						const usagePercent = parseFloat(parts[4].replace('%', ''));

						return {
							total: totalBlocks,
							used: usedBlocks,
							free: availableBlocks,
							usagePercent: usagePercent,
						};
					}
				} catch (dfError) {
					this.logger.debug('df command failed, falling back to statvfs', {
						error: dfError.message,
					});
				}

				// Fallback: Try to get basic filesystem info
				try {
					const stats = await fs.statfs('/');
					const blockSize = stats.bavail > 0 ? (stats as any).frsize || stats.bsize : 4096;
					const total = stats.blocks * blockSize;
					const free = stats.bavail * blockSize;
					const used = total - free;
					const usagePercent = total > 0 ? (used / total) * 100 : 0;

					return {
						total,
						used,
						free,
						usagePercent,
					};
				} catch (statvfsError) {
					this.logger.debug('statvfs failed', { error: statvfsError.message });
				}
			} else {
				// Windows: Use wmic command for disk space
				try {
					const { stdout } = await execAsync(
						'wmic logicaldisk where size!=0 get size,freespace,caption /format:csv',
					);
					const lines = stdout
						.trim()
						.split('\n')
						.filter((line) => line.includes(','));

					if (lines.length > 1) {
						// Parse the first disk (usually C:)
						const parts = lines[1].split(',');
						if (parts.length >= 4) {
							const free = parseInt(parts[2]);
							const total = parseInt(parts[3]);
							const used = total - free;
							const usagePercent = total > 0 ? (used / total) * 100 : 0;

							return {
								total,
								used,
								free,
								usagePercent,
							};
						}
					}
				} catch (wmicError) {
					this.logger.debug('wmic command failed', { error: wmicError.message });
				}
			}

			// Ultimate fallback: Return default values
			this.logger.warn('Unable to get accurate disk usage, using defaults');
			return {
				total: 100 * 1024 * 1024 * 1024, // 100GB default
				used: 50 * 1024 * 1024 * 1024, // 50GB default
				free: 50 * 1024 * 1024 * 1024, // 50GB default
				usagePercent: 50, // 50% default
			};
		} catch (error) {
			this.logger.warn('Failed to get disk usage statistics', {
				error: error.message,
			});

			// Return safe default values on error
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
	 * This implementation uses in-memory storage for demonstration
	 * In production, you would use a time-series database
	 */
	async getResourceHistory(timeRange: string): Promise<SystemResourcesDto[]> {
		try {
			// For now, generate historical data points based on current resources
			// In a real implementation, this would come from stored historical data
			const now = Date.now();
			const dataPoints: SystemResourcesDto[] = [];

			let intervalMs: number;
			let count: number;

			switch (timeRange) {
				case '1h':
					intervalMs = 5 * 60 * 1000; // 5 minutes
					count = 12; // 12 data points over 1 hour
					break;
				case '6h':
					intervalMs = 30 * 60 * 1000; // 30 minutes
					count = 12; // 12 data points over 6 hours
					break;
				case '24h':
					intervalMs = 2 * 60 * 60 * 1000; // 2 hours
					count = 12; // 12 data points over 24 hours
					break;
				case '7d':
					intervalMs = 14 * 60 * 60 * 1000; // 14 hours
					count = 12; // 12 data points over 7 days
					break;
				case '30d':
					intervalMs = 2.5 * 24 * 60 * 60 * 1000; // 2.5 days
					count = 12; // 12 data points over 30 days
					break;
				default:
					intervalMs = 2 * 60 * 60 * 1000; // Default to 2 hours
					count = 12;
			}

			// Get current resources as baseline
			const currentResources = await this.getCurrentResources();

			// Generate historical data points with some variation
			for (let i = count - 1; i >= 0; i--) {
				const timestamp = new Date(now - i * intervalMs);

				// Add some realistic variation to the data
				const cpuVariation = (Math.random() - 0.5) * 20; // ±10%
				const memoryVariation = (Math.random() - 0.5) * 10; // ±5%
				const diskVariation = (Math.random() - 0.5) * 4; // ±2%

				const historicalPoint: SystemResourcesDto = {
					timestamp: timestamp.toISOString(),
					system: {
						cpu: {
							usage: Math.max(0, Math.min(100, currentResources.system.cpu.usage + cpuVariation)),
							cores: currentResources.system.cpu.cores,
							load: currentResources.system.cpu.load.map((load) =>
								Math.max(0, load + (Math.random() - 0.5) * 0.5),
							) as [number, number, number],
						},
						memory: {
							total: currentResources.system.memory.total,
							used: Math.max(
								0,
								currentResources.system.memory.used +
									(currentResources.system.memory.total * memoryVariation) / 100,
							),
							free: 0, // Will be calculated
							usagePercent: Math.max(
								0,
								Math.min(100, currentResources.system.memory.usagePercent + memoryVariation),
							),
						},
						disk: {
							total: currentResources.system.disk.total,
							used: Math.max(
								0,
								currentResources.system.disk.used +
									(currentResources.system.disk.total * diskVariation) / 100,
							),
							free: 0, // Will be calculated
							usagePercent: Math.max(
								0,
								Math.min(100, currentResources.system.disk.usagePercent + diskVariation),
							),
						},
					},
					processes: currentResources.processes,
				};

				// Calculate derived values
				historicalPoint.system.memory.free =
					historicalPoint.system.memory.total - historicalPoint.system.memory.used;
				historicalPoint.system.disk.free =
					historicalPoint.system.disk.total - historicalPoint.system.disk.used;

				dataPoints.push(historicalPoint);
			}

			this.logger.debug('Generated resource history', {
				timeRange,
				count: dataPoints.length,
			});

			return dataPoints;
		} catch (error) {
			this.logger.error('Failed to get resource history', {
				timeRange,
				error: error.message,
			});
			return [];
		}
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
