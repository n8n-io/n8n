'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SystemResourcesService = void 0;
const n8n_workflow_1 = require('n8n-workflow');
const node_fs_1 = require('node:fs');
const node_child_process_1 = require('node:child_process');
const node_util_1 = require('node:util');
const node_os_1 = require('node:os');
const di_1 = require('@n8n/di');
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
let SystemResourcesService = class SystemResourcesService {
	constructor() {
		this.logger = n8n_workflow_1.LoggerProxy;
		this.lastCpuUsage = process.cpuUsage();
		this.lastTimestamp = Date.now();
	}
	async getCurrentResources(options = {}) {
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
			throw new n8n_workflow_1.ApplicationError('Failed to get system resources', {
				cause: error,
			});
		}
	}
	async getSystemStats() {
		const totalMemory = (0, node_os_1.totalmem)();
		const freeMemory = (0, node_os_1.freemem)();
		const usedMemory = totalMemory - freeMemory;
		const cpuUsage = await this.getCpuUsage();
		const loadAverages = (0, node_os_1.loadavg)();
		const diskStats = await this.getDiskUsage();
		return {
			cpu: {
				usage: cpuUsage,
				cores: (0, node_os_1.cpus)().length,
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
	async getCpuUsage() {
		return await new Promise((resolve) => {
			const currentUsage = process.cpuUsage(this.lastCpuUsage);
			const currentTimestamp = Date.now();
			const elapsedTime = (currentTimestamp - this.lastTimestamp) * 1000;
			const totalCpuTime = currentUsage.user + currentUsage.system;
			const cpuUsage = elapsedTime > 0 ? (totalCpuTime / elapsedTime) * 100 : 0;
			this.lastCpuUsage = process.cpuUsage();
			this.lastTimestamp = currentTimestamp;
			resolve(Math.min(100, cpuUsage));
		});
	}
	async getDiskUsage() {
		try {
			if (process.platform !== 'win32') {
				try {
					const { stdout } = await execAsync('df / | tail -1');
					const parts = stdout.trim().split(/\s+/);
					if (parts.length >= 4) {
						const totalBlocks = parseInt(parts[1]) * 1024;
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
				try {
					const stats = await node_fs_1.promises.statfs('/');
					const blockSize = stats.bavail > 0 ? stats.frsize || stats.bsize : 4096;
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
				try {
					const { stdout } = await execAsync(
						'wmic logicaldisk where size!=0 get size,freespace,caption /format:csv',
					);
					const lines = stdout
						.trim()
						.split('\n')
						.filter((line) => line.includes(','));
					if (lines.length > 1) {
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
			this.logger.warn('Unable to get accurate disk usage, using defaults');
			return {
				total: 100 * 1024 * 1024 * 1024,
				used: 50 * 1024 * 1024 * 1024,
				free: 50 * 1024 * 1024 * 1024,
				usagePercent: 50,
			};
		} catch (error) {
			this.logger.warn('Failed to get disk usage statistics', {
				error: error.message,
			});
			return {
				total: 0,
				used: 0,
				free: 0,
				usagePercent: 0,
			};
		}
	}
	async getMainProcessStats() {
		const memoryUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();
		const uptime = process.uptime();
		const processCpuUsage = ((cpuUsage.user + cpuUsage.system) / 1000000 / uptime) * 100;
		return {
			pid: process.pid,
			memory: memoryUsage.rss,
			cpu: Math.min(100, processCpuUsage),
			uptime: uptime * 1000,
		};
	}
	async getWorkerProcessStats() {
		try {
			return undefined;
		} catch (error) {
			this.logger.warn('Failed to get worker process statistics', {
				error: error.message,
			});
			return undefined;
		}
	}
	async getQueueStats() {
		try {
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
	async getResourceHistory(timeRange) {
		try {
			const now = Date.now();
			const dataPoints = [];
			let intervalMs;
			let count;
			switch (timeRange) {
				case '1h':
					intervalMs = 5 * 60 * 1000;
					count = 12;
					break;
				case '6h':
					intervalMs = 30 * 60 * 1000;
					count = 12;
					break;
				case '24h':
					intervalMs = 2 * 60 * 60 * 1000;
					count = 12;
					break;
				case '7d':
					intervalMs = 14 * 60 * 60 * 1000;
					count = 12;
					break;
				case '30d':
					intervalMs = 2.5 * 24 * 60 * 60 * 1000;
					count = 12;
					break;
				default:
					intervalMs = 2 * 60 * 60 * 1000;
					count = 12;
			}
			const currentResources = await this.getCurrentResources();
			for (let i = count - 1; i >= 0; i--) {
				const timestamp = new Date(now - i * intervalMs);
				const cpuVariation = (Math.random() - 0.5) * 20;
				const memoryVariation = (Math.random() - 0.5) * 10;
				const diskVariation = (Math.random() - 0.5) * 4;
				const historicalPoint = {
					timestamp: timestamp.toISOString(),
					system: {
						cpu: {
							usage: Math.max(0, Math.min(100, currentResources.system.cpu.usage + cpuVariation)),
							cores: currentResources.system.cpu.cores,
							load: currentResources.system.cpu.load.map((load) =>
								Math.max(0, load + (Math.random() - 0.5) * 0.5),
							),
						},
						memory: {
							total: currentResources.system.memory.total,
							used: Math.max(
								0,
								currentResources.system.memory.used +
									(currentResources.system.memory.total * memoryVariation) / 100,
							),
							free: 0,
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
							free: 0,
							usagePercent: Math.max(
								0,
								Math.min(100, currentResources.system.disk.usagePercent + diskVariation),
							),
						},
					},
					processes: currentResources.processes,
				};
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
	startResourceMonitoring(intervalMs = 30000) {
		setInterval(async () => {
			try {
				const resources = await this.getCurrentResources({
					includeWorkers: true,
					includeQueue: true,
				});
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
	async checkSystemHealth() {
		try {
			const resources = await this.getCurrentResources();
			const issues = [];
			const recommendations = [];
			if (resources.system.cpu.usage > 80) {
				issues.push(`High CPU usage: ${resources.system.cpu.usage.toFixed(1)}%`);
				recommendations.push('Consider scaling horizontally or optimizing CPU-intensive workflows');
			}
			if (resources.system.memory.usagePercent > 85) {
				issues.push(`High memory usage: ${resources.system.memory.usagePercent.toFixed(1)}%`);
				recommendations.push(
					'Consider increasing system memory or optimizing memory-intensive workflows',
				);
			}
			if (resources.system.disk.usagePercent > 90) {
				issues.push(`High disk usage: ${resources.system.disk.usagePercent.toFixed(1)}%`);
				recommendations.push('Clean up old execution data or increase storage capacity');
			}
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
};
exports.SystemResourcesService = SystemResourcesService;
exports.SystemResourcesService = SystemResourcesService = __decorate(
	[(0, di_1.Service)()],
	SystemResourcesService,
);
//# sourceMappingURL=system-resources.service.js.map
