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
const node_os_1 = require('node:os');
const di_1 = require('@n8n/di');
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
				const stats = await node_fs_1.promises.stat('/');
				return {
					total: 100 * 1024 * 1024 * 1024,
					used: 50 * 1024 * 1024 * 1024,
					free: 50 * 1024 * 1024 * 1024,
					usagePercent: 50,
				};
			} else {
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
		this.logger.warn('Resource history not implemented yet', { timeRange });
		return [];
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
