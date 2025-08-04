import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

interface ResourceUsage {
	cpu: {
		percent: number;
		cores: number;
		load: [number, number, number]; // 1min, 5min, 15min
	};
	memory: {
		total: number;
		used: number;
		free: number;
		percent: number;
	};
	disk: {
		total: number;
		used: number;
		free: number;
		percent: number;
	};
	network: {
		bytesReceived: number;
		bytesSent: number;
		packetsReceived: number;
		packetsSent: number;
	};
	processes: {
		total: number;
		running: number;
		sleeping: number;
		zombie: number;
	};
	timestamp: Date;
}

interface ContainerStats {
	containerId: string;
	name: string;
	cpu: {
		percent: number;
		usage: number;
		systemUsage: number;
	};
	memory: {
		usage: number;
		limit: number;
		percent: number;
	};
	network: {
		rxBytes: number;
		txBytes: number;
		rxPackets: number;
		txPackets: number;
	};
	blockIO: {
		readBytes: number;
		writeBytes: number;
	};
	pids: number;
	timestamp: Date;
}

interface ResourceThreshold {
	name: string;
	metric: string;
	operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
	value: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
	duration: number; // milliseconds
	enabled: boolean;
}

interface ResourceAlert {
	id: string;
	threshold: ResourceThreshold;
	value: number;
	timestamp: Date;
	resolved: boolean;
	resolvedAt?: Date;
	duration: number;
}

@Service()
export class ResourceMonitorService extends EventEmitter {
	private readonly execFileAsync = promisify(execFile);
	private monitoringInterval?: NodeJS.Timeout;
	private dockerStatsInterval?: NodeJS.Timeout;
	private readonly resourceHistory: ResourceUsage[] = [];
	private readonly containerHistory: Map<string, ContainerStats[]> = new Map();
	private readonly activeAlerts = new Map<string, ResourceAlert>();
	private readonly thresholds: ResourceThreshold[] = [];

	constructor(private readonly logger: Logger) {
		super();
		this.setupDefaultThresholds();
	}

	/**
	 * Start resource monitoring
	 */
	async startMonitoring(intervalMs: number = 5000): Promise<void> {
		if (this.monitoringInterval) {
			this.logger.warn('Resource monitoring already started');
			return;
		}

		this.logger.info('Starting resource monitoring', { intervalMs });

		// Start system resource monitoring
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

		// Start Docker container monitoring
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

		// Initial collection
		try {
			const usage = await this.collectSystemResources();
			this.resourceHistory.push(usage);
			this.emit('resourceUpdate', usage);
		} catch (error) {
			this.logger.error('Failed to collect initial system resources', { error });
		}
	}

	/**
	 * Stop resource monitoring
	 */
	stopMonitoring(): void {
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

	/**
	 * Collect system resource usage
	 */
	private async collectSystemResources(): Promise<ResourceUsage> {
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

	/**
	 * Get CPU information
	 */
	private async getCpuInfo(): Promise<ResourceUsage['cpu']> {
		try {
			// Try to get CPU usage from /proc/stat on Linux
			const { stdout } = await this.execFileAsync('cat', ['/proc/stat']);
			const lines = stdout.split('\n');
			const cpuLine = lines[0];
			const values = cpuLine.split(/\s+/).slice(1).map(Number);

			const idle = values[3];
			const total = values.reduce((sum, val) => sum + val, 0);
			const usage = total - idle;
			const percent = Math.round((usage / total) * 100);

			// Get load average
			const { stdout: loadavg } = await this.execFileAsync('cat', ['/proc/loadavg']);
			const loads = loadavg.split(' ').slice(0, 3).map(Number) as [number, number, number];

			// Get CPU count
			const { stdout: cpuinfo } = await this.execFileAsync('grep', [
				'-c',
				'^processor',
				'/proc/cpuinfo',
			]);
			const cores = parseInt(cpuinfo.trim(), 10);

			return { percent, cores, load: loads };
		} catch {
			// Fallback for non-Linux systems
			try {
				const { stdout } = await this.execFileAsync('sysctl', ['-n', 'hw.ncpu']);
				const cores = parseInt(stdout.trim(), 10);
				return { percent: 0, cores, load: [0, 0, 0] };
			} catch {
				return { percent: 0, cores: 1, load: [0, 0, 0] };
			}
		}
	}

	/**
	 * Get memory information
	 */
	private async getMemoryInfo(): Promise<ResourceUsage['memory']> {
		try {
			// Try Linux /proc/meminfo
			const { stdout } = await this.execFileAsync('cat', ['/proc/meminfo']);
			const lines = stdout.split('\n');

			const getMemValue = (name: string): number => {
				const line = lines.find((l) => l.startsWith(name));
				if (!line) return 0;
				return parseInt(line.split(/\s+/)[1], 10) * 1024; // Convert KB to bytes
			};

			const total = getMemValue('MemTotal:');
			const free = getMemValue('MemFree:') + getMemValue('Buffers:') + getMemValue('Cached:');
			const used = total - free;
			const percent = Math.round((used / total) * 100);

			return { total, used, free, percent };
		} catch {
			// Fallback - use process memory as approximation
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

	/**
	 * Get disk information
	 */
	private async getDiskInfo(): Promise<ResourceUsage['disk']> {
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

	/**
	 * Get network information
	 */
	private async getNetworkInfo(): Promise<ResourceUsage['network']> {
		try {
			const { stdout } = await this.execFileAsync('cat', ['/proc/net/dev']);
			const lines = stdout.split('\n').slice(2); // Skip header lines

			let bytesReceived = 0;
			let bytesSent = 0;
			let packetsReceived = 0;
			let packetsSent = 0;

			for (const line of lines) {
				if (!line.trim()) continue;
				const parts = line.trim().split(/\s+/);
				if (parts.length < 17) continue;

				const iface = parts[0].replace(':', '');
				if (iface === 'lo') continue; // Skip loopback

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

	/**
	 * Get process information
	 */
	private async getProcessInfo(): Promise<ResourceUsage['processes']> {
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

	/**
	 * Collect Docker container statistics
	 */
	private async collectDockerStats(): Promise<ContainerStats[]> {
		try {
			const { stdout } = await this.execFileAsync('docker', [
				'stats',
				'--no-stream',
				'--format',
				'table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}',
			]);

			const lines = stdout.split('\n').slice(1); // Skip header
			const stats: ContainerStats[] = [];

			for (const line of lines) {
				if (!line.trim()) continue;
				const parts = line.split('\t');
				if (parts.length < 8) continue;

				const [containerId, name, cpuPerc, memUsage, memPerc, netIO, blockIO, pids] = parts;

				// Parse memory usage (e.g., "123.4MiB / 512MiB")
				const memParts = memUsage.split(' / ');
				const memUsed = this.parseMemorySize(memParts[0]);
				const memLimit = this.parseMemorySize(memParts[1]);

				// Parse network I/O (e.g., "1.23kB / 4.56kB")
				const netParts = netIO.split(' / ');
				const rxBytes = this.parseMemorySize(netParts[0]);
				const txBytes = this.parseMemorySize(netParts[1]);

				// Parse block I/O (e.g., "0B / 123kB")
				const blockParts = blockIO.split(' / ');
				const readBytes = this.parseMemorySize(blockParts[0]);
				const writeBytes = this.parseMemorySize(blockParts[1]);

				stats.push({
					containerId: containerId.substring(0, 12),
					name,
					cpu: {
						percent: parseFloat(cpuPerc.replace('%', '')),
						usage: 0, // Not available from docker stats format
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
						rxPackets: 0, // Not available from docker stats format
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
			throw new ApplicationError('Failed to collect Docker stats', { cause: error });
		}
	}

	/**
	 * Parse memory size string to bytes
	 */
	private parseMemorySize(sizeStr: string): number {
		const size = parseFloat(sizeStr);
		const unit = sizeStr.replace(/[\d.]/g, '').toUpperCase();

		const multipliers: Record<string, number> = {
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

	/**
	 * Setup default resource thresholds
	 */
	private setupDefaultThresholds(): void {
		const defaultThresholds: ResourceThreshold[] = [
			{
				name: 'High CPU Usage',
				metric: 'cpu.percent',
				operator: 'gte',
				value: 80,
				severity: 'high',
				duration: 30000, // 30 seconds
				enabled: true,
			},
			{
				name: 'Critical CPU Usage',
				metric: 'cpu.percent',
				operator: 'gte',
				value: 95,
				severity: 'critical',
				duration: 10000, // 10 seconds
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
				duration: 60000, // 1 minute
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

	/**
	 * Check resource thresholds and trigger alerts
	 */
	private checkThresholds(usage: ResourceUsage): void {
		for (const threshold of this.thresholds) {
			if (!threshold.enabled) continue;

			const value = this.getMetricValue(usage, threshold.metric);
			const breached = this.evaluateThreshold(value, threshold);

			const alertId = `${threshold.name}-${threshold.metric}`;
			const existingAlert = this.activeAlerts.get(alertId);

			if (breached) {
				if (!existingAlert) {
					// Create new alert
					const alert: ResourceAlert = {
						id: alertId,
						threshold,
						value,
						timestamp: new Date(),
						resolved: false,
						duration: 0,
					};
					this.activeAlerts.set(alertId, alert);

					// Check if alert should be triggered based on duration
					setTimeout(() => {
						const currentAlert = this.activeAlerts.get(alertId);
						if (currentAlert && !currentAlert.resolved) {
							this.triggerAlert(currentAlert);
						}
					}, threshold.duration);
				}
			} else if (existingAlert && !existingAlert.resolved) {
				// Resolve existing alert
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

	/**
	 * Get metric value from resource usage
	 */
	private getMetricValue(usage: ResourceUsage, metric: string): number {
		const parts = metric.split('.');
		let value: any = usage;

		for (const part of parts) {
			value = value?.[part];
		}

		return typeof value === 'number' ? value : 0;
	}

	/**
	 * Evaluate if threshold is breached
	 */
	private evaluateThreshold(value: number, threshold: ResourceThreshold): boolean {
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

	/**
	 * Trigger resource alert
	 */
	private triggerAlert(alert: ResourceAlert): void {
		this.logger.warn('Resource threshold breached', {
			alert,
		});

		this.emit('alert', alert);
	}

	/**
	 * Trim resource history to prevent memory leaks
	 */
	private trimHistory(): void {
		const maxHistorySize = 288; // 24 hours at 5-minute intervals
		if (this.resourceHistory.length > maxHistorySize) {
			this.resourceHistory.splice(0, this.resourceHistory.length - maxHistorySize);
		}
	}

	/**
	 * Get current resource usage
	 */
	getCurrentUsage(): ResourceUsage | null {
		return this.resourceHistory[this.resourceHistory.length - 1] || null;
	}

	/**
	 * Get resource history
	 */
	getResourceHistory(hours: number = 1): ResourceUsage[] {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		return this.resourceHistory.filter((usage) => usage.timestamp >= cutoff);
	}

	/**
	 * Get container stats
	 */
	getContainerStats(containerId?: string): ContainerStats[] {
		if (containerId) {
			return this.containerHistory.get(containerId) || [];
		}

		// Return latest stats for all containers
		const latest: ContainerStats[] = [];
		for (const stats of this.containerHistory.values()) {
			if (stats.length > 0) {
				latest.push(stats[stats.length - 1]);
			}
		}
		return latest;
	}

	/**
	 * Get active alerts
	 */
	getActiveAlerts(): ResourceAlert[] {
		return Array.from(this.activeAlerts.values()).filter((alert) => !alert.resolved);
	}

	/**
	 * Get all alerts
	 */
	getAllAlerts(): ResourceAlert[] {
		return Array.from(this.activeAlerts.values());
	}

	/**
	 * Add custom threshold
	 */
	addThreshold(threshold: ResourceThreshold): void {
		this.thresholds.push(threshold);
	}

	/**
	 * Remove threshold
	 */
	removeThreshold(name: string): boolean {
		const index = this.thresholds.findIndex((t) => t.name === name);
		if (index !== -1) {
			this.thresholds.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Get all thresholds
	 */
	getThresholds(): ResourceThreshold[] {
		return [...this.thresholds];
	}
}
