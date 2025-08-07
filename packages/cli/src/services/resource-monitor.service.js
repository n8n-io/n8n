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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ResourceMonitorService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const child_process_1 = require('child_process');
const util_1 = require('util');
const events_1 = require('events');
let ResourceMonitorService = class ResourceMonitorService extends events_1.EventEmitter {
	constructor(logger) {
		super();
		this.logger = logger;
		this.execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
		this.resourceHistory = [];
		this.containerHistory = new Map();
		this.activeAlerts = new Map();
		this.thresholds = [];
		this.setupDefaultThresholds();
	}
	async startMonitoring(intervalMs = 5000) {
		if (this.monitoringInterval) {
			this.logger.warn('Resource monitoring already started');
			return;
		}
		this.logger.info('Starting resource monitoring', { intervalMs });
		this.monitoringInterval = setInterval(async () => {
			try {
				const usage = await this.collectSystemResources();
				this.resourceHistory.push(usage);
				this.trimHistory();
				this.checkThresholds(usage);
				this.emit('resourceUpdate', usage);
			} catch (error) {
				this.logger.error('Failed to collect system resources', { error });
			}
		}, intervalMs);
		this.dockerStatsInterval = setInterval(async () => {
			try {
				const containers = await this.collectDockerStats();
				for (const container of containers) {
					const history = this.containerHistory.get(container.containerId) || [];
					history.push(container);
					if (history.length > 100) {
						history.shift();
					}
					this.containerHistory.set(container.containerId, history);
					this.emit('containerUpdate', container);
				}
			} catch (error) {
				this.logger.debug('Failed to collect Docker stats (Docker may not be available)', {
					error,
				});
			}
		}, intervalMs);
		try {
			const usage = await this.collectSystemResources();
			this.resourceHistory.push(usage);
			this.emit('resourceUpdate', usage);
		} catch (error) {
			this.logger.error('Failed to collect initial system resources', { error });
		}
	}
	stopMonitoring() {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = undefined;
		}
		if (this.dockerStatsInterval) {
			clearInterval(this.dockerStatsInterval);
			this.dockerStatsInterval = undefined;
		}
		this.logger.info('Resource monitoring stopped');
	}
	async collectSystemResources() {
		const [cpuInfo, memInfo, diskInfo, netInfo, procInfo] = await Promise.allSettled([
			this.getCpuInfo(),
			this.getMemoryInfo(),
			this.getDiskInfo(),
			this.getNetworkInfo(),
			this.getProcessInfo(),
		]);
		return {
			cpu:
				cpuInfo.status === 'fulfilled' ? cpuInfo.value : { percent: 0, cores: 1, load: [0, 0, 0] },
			memory:
				memInfo.status === 'fulfilled' ? memInfo.value : { total: 0, used: 0, free: 0, percent: 0 },
			disk:
				diskInfo.status === 'fulfilled'
					? diskInfo.value
					: { total: 0, used: 0, free: 0, percent: 0 },
			network:
				netInfo.status === 'fulfilled'
					? netInfo.value
					: { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0 },
			processes:
				procInfo.status === 'fulfilled'
					? procInfo.value
					: { total: 0, running: 0, sleeping: 0, zombie: 0 },
			timestamp: new Date(),
		};
	}
	async getCpuInfo() {
		try {
			const { stdout } = await this.execFileAsync('cat', ['/proc/stat']);
			const lines = stdout.split('\n');
			const cpuLine = lines[0];
			const values = cpuLine.split(/\s+/).slice(1).map(Number);
			const idle = values[3];
			const total = values.reduce((sum, val) => sum + val, 0);
			const usage = total - idle;
			const percent = Math.round((usage / total) * 100);
			const { stdout: loadavg } = await this.execFileAsync('cat', ['/proc/loadavg']);
			const loads = loadavg.split(' ').slice(0, 3).map(Number);
			const { stdout: cpuinfo } = await this.execFileAsync('grep', [
				'-c',
				'^processor',
				'/proc/cpuinfo',
			]);
			const cores = parseInt(cpuinfo.trim(), 10);
			return { percent, cores, load: loads };
		} catch {
			try {
				const { stdout } = await this.execFileAsync('sysctl', ['-n', 'hw.ncpu']);
				const cores = parseInt(stdout.trim(), 10);
				return { percent: 0, cores, load: [0, 0, 0] };
			} catch {
				return { percent: 0, cores: 1, load: [0, 0, 0] };
			}
		}
	}
	async getMemoryInfo() {
		try {
			const { stdout } = await this.execFileAsync('cat', ['/proc/meminfo']);
			const lines = stdout.split('\n');
			const getMemValue = (name) => {
				const line = lines.find((l) => l.startsWith(name));
				if (!line) return 0;
				return parseInt(line.split(/\s+/)[1], 10) * 1024;
			};
			const total = getMemValue('MemTotal:');
			const free = getMemValue('MemFree:') + getMemValue('Buffers:') + getMemValue('Cached:');
			const used = total - free;
			const percent = Math.round((used / total) * 100);
			return { total, used, free, percent };
		} catch {
			const usage = process.memoryUsage();
			const total = usage.heapTotal + usage.external;
			return {
				total,
				used: usage.heapUsed,
				free: total - usage.heapUsed,
				percent: Math.round((usage.heapUsed / total) * 100),
			};
		}
	}
	async getDiskInfo() {
		try {
			const { stdout } = await this.execFileAsync('df', ['-B1', '/']);
			const lines = stdout.split('\n');
			const dataLine = lines[1];
			const values = dataLine.split(/\s+/);
			const total = parseInt(values[1], 10);
			const used = parseInt(values[2], 10);
			const free = parseInt(values[3], 10);
			const percent = parseInt(values[4].replace('%', ''), 10);
			return { total, used, free, percent };
		} catch {
			return { total: 0, used: 0, free: 0, percent: 0 };
		}
	}
	async getNetworkInfo() {
		try {
			const { stdout } = await this.execFileAsync('cat', ['/proc/net/dev']);
			const lines = stdout.split('\n').slice(2);
			let bytesReceived = 0;
			let bytesSent = 0;
			let packetsReceived = 0;
			let packetsSent = 0;
			for (const line of lines) {
				if (!line.trim()) continue;
				const parts = line.trim().split(/\s+/);
				if (parts.length < 17) continue;
				const iface = parts[0].replace(':', '');
				if (iface === 'lo') continue;
				bytesReceived += parseInt(parts[1], 10);
				packetsReceived += parseInt(parts[2], 10);
				bytesSent += parseInt(parts[9], 10);
				packetsSent += parseInt(parts[10], 10);
			}
			return { bytesReceived, bytesSent, packetsReceived, packetsSent };
		} catch {
			return { bytesReceived: 0, bytesSent: 0, packetsReceived: 0, packetsSent: 0 };
		}
	}
	async getProcessInfo() {
		try {
			const { stdout } = await this.execFileAsync('ps', ['axo', 'stat', '--no-headers']);
			const states = stdout
				.split('\n')
				.map((line) => line.trim().charAt(0))
				.filter(Boolean);
			const total = states.length;
			const running = states.filter((s) => s === 'R').length;
			const sleeping = states.filter((s) => s === 'S' || s === 'I').length;
			const zombie = states.filter((s) => s === 'Z').length;
			return { total, running, sleeping, zombie };
		} catch {
			return { total: 1, running: 1, sleeping: 0, zombie: 0 };
		}
	}
	async collectDockerStats() {
		try {
			const { stdout } = await this.execFileAsync('docker', [
				'stats',
				'--no-stream',
				'--format',
				'table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}',
			]);
			const lines = stdout.split('\n').slice(1);
			const stats = [];
			for (const line of lines) {
				if (!line.trim()) continue;
				const parts = line.split('\t');
				if (parts.length < 8) continue;
				const [containerId, name, cpuPerc, memUsage, memPerc, netIO, blockIO, pids] = parts;
				const memParts = memUsage.split(' / ');
				const memUsed = this.parseMemorySize(memParts[0]);
				const memLimit = this.parseMemorySize(memParts[1]);
				const netParts = netIO.split(' / ');
				const rxBytes = this.parseMemorySize(netParts[0]);
				const txBytes = this.parseMemorySize(netParts[1]);
				const blockParts = blockIO.split(' / ');
				const readBytes = this.parseMemorySize(blockParts[0]);
				const writeBytes = this.parseMemorySize(blockParts[1]);
				stats.push({
					containerId: containerId.substring(0, 12),
					name,
					cpu: {
						percent: parseFloat(cpuPerc.replace('%', '')),
						usage: 0,
						systemUsage: 0,
					},
					memory: {
						usage: memUsed,
						limit: memLimit,
						percent: parseFloat(memPerc.replace('%', '')),
					},
					network: {
						rxBytes,
						txBytes,
						rxPackets: 0,
						txPackets: 0,
					},
					blockIO: {
						readBytes,
						writeBytes,
					},
					pids: parseInt(pids, 10),
					timestamp: new Date(),
				});
			}
			return stats;
		} catch (error) {
			throw new n8n_workflow_1.ApplicationError('Failed to collect Docker stats', { cause: error });
		}
	}
	parseMemorySize(sizeStr) {
		const size = parseFloat(sizeStr);
		const unit = sizeStr.replace(/[\d.]/g, '').toUpperCase();
		const multipliers = {
			B: 1,
			KB: 1024,
			MB: 1024 * 1024,
			GB: 1024 * 1024 * 1024,
			KIB: 1024,
			MIB: 1024 * 1024,
			GIB: 1024 * 1024 * 1024,
		};
		return size * (multipliers[unit] || 1);
	}
	setupDefaultThresholds() {
		const defaultThresholds = [
			{
				name: 'High CPU Usage',
				metric: 'cpu.percent',
				operator: 'gte',
				value: 80,
				severity: 'high',
				duration: 30000,
				enabled: true,
			},
			{
				name: 'Critical CPU Usage',
				metric: 'cpu.percent',
				operator: 'gte',
				value: 95,
				severity: 'critical',
				duration: 10000,
				enabled: true,
			},
			{
				name: 'High Memory Usage',
				metric: 'memory.percent',
				operator: 'gte',
				value: 85,
				severity: 'high',
				duration: 30000,
				enabled: true,
			},
			{
				name: 'Critical Memory Usage',
				metric: 'memory.percent',
				operator: 'gte',
				value: 95,
				severity: 'critical',
				duration: 10000,
				enabled: true,
			},
			{
				name: 'High Disk Usage',
				metric: 'disk.percent',
				operator: 'gte',
				value: 90,
				severity: 'medium',
				duration: 60000,
				enabled: true,
			},
			{
				name: 'Critical Disk Usage',
				metric: 'disk.percent',
				operator: 'gte',
				value: 98,
				severity: 'critical',
				duration: 30000,
				enabled: true,
			},
		];
		this.thresholds.push(...defaultThresholds);
	}
	checkThresholds(usage) {
		for (const threshold of this.thresholds) {
			if (!threshold.enabled) continue;
			const value = this.getMetricValue(usage, threshold.metric);
			const breached = this.evaluateThreshold(value, threshold);
			const alertId = `${threshold.name}-${threshold.metric}`;
			const existingAlert = this.activeAlerts.get(alertId);
			if (breached) {
				if (!existingAlert) {
					const alert = {
						id: alertId,
						threshold,
						value,
						timestamp: new Date(),
						resolved: false,
						duration: 0,
					};
					this.activeAlerts.set(alertId, alert);
					setTimeout(() => {
						const currentAlert = this.activeAlerts.get(alertId);
						if (currentAlert && !currentAlert.resolved) {
							this.triggerAlert(currentAlert);
						}
					}, threshold.duration);
				}
			} else if (existingAlert && !existingAlert.resolved) {
				existingAlert.resolved = true;
				existingAlert.resolvedAt = new Date();
				existingAlert.duration =
					existingAlert.resolvedAt.getTime() - existingAlert.timestamp.getTime();
				this.logger.info('Resource alert resolved', {
					alert: existingAlert,
					currentValue: value,
				});
				this.emit('alertResolved', existingAlert);
			}
		}
	}
	getMetricValue(usage, metric) {
		const parts = metric.split('.');
		let value = usage;
		for (const part of parts) {
			value = value?.[part];
		}
		return typeof value === 'number' ? value : 0;
	}
	evaluateThreshold(value, threshold) {
		switch (threshold.operator) {
			case 'gt':
				return value > threshold.value;
			case 'gte':
				return value >= threshold.value;
			case 'lt':
				return value < threshold.value;
			case 'lte':
				return value <= threshold.value;
			case 'eq':
				return value === threshold.value;
			default:
				return false;
		}
	}
	triggerAlert(alert) {
		this.logger.warn('Resource threshold breached', {
			alert,
		});
		this.emit('alert', alert);
	}
	trimHistory() {
		const maxHistorySize = 288;
		if (this.resourceHistory.length > maxHistorySize) {
			this.resourceHistory.splice(0, this.resourceHistory.length - maxHistorySize);
		}
	}
	getCurrentUsage() {
		return this.resourceHistory[this.resourceHistory.length - 1] || null;
	}
	getResourceHistory(hours = 1) {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		return this.resourceHistory.filter((usage) => usage.timestamp >= cutoff);
	}
	getContainerStats(containerId) {
		if (containerId) {
			return this.containerHistory.get(containerId) || [];
		}
		const latest = [];
		for (const stats of this.containerHistory.values()) {
			if (stats.length > 0) {
				latest.push(stats[stats.length - 1]);
			}
		}
		return latest;
	}
	getActiveAlerts() {
		return Array.from(this.activeAlerts.values()).filter((alert) => !alert.resolved);
	}
	getAllAlerts() {
		return Array.from(this.activeAlerts.values());
	}
	addThreshold(threshold) {
		this.thresholds.push(threshold);
	}
	removeThreshold(name) {
		const index = this.thresholds.findIndex((t) => t.name === name);
		if (index !== -1) {
			this.thresholds.splice(index, 1);
			return true;
		}
		return false;
	}
	getThresholds() {
		return [...this.thresholds];
	}
};
exports.ResourceMonitorService = ResourceMonitorService;
exports.ResourceMonitorService = ResourceMonitorService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	ResourceMonitorService,
);
//# sourceMappingURL=resource-monitor.service.js.map
