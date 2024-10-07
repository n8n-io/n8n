import os from 'node:os';
import { Service } from 'typedi';

import config from '@/config';
import { N8N_VERSION } from '@/constants';

import { JobProcessor } from './job-processor';

@Service()
export class WorkerStatus {
	constructor(private readonly jobProcessor: JobProcessor) {}

	generateStatus() {
		return {
			workerId: config.getEnv('redis.queueModeId'),
			runningJobsSummary: this.jobProcessor.getRunningJobsSummary(),
			freeMem: os.freemem(),
			totalMem: os.totalmem(),
			uptime: process.uptime(),
			loadAvg: os.loadavg(),
			cpus: this.getOsCpuString(),
			arch: os.arch(),
			platform: os.platform(),
			hostname: os.hostname(),
			interfaces: Object.values(os.networkInterfaces()).flatMap((interfaces) =>
				(interfaces ?? [])?.map((net) => ({
					family: net.family,
					address: net.address,
					internal: net.internal,
				})),
			),
			version: N8N_VERSION,
		};
	}

	private getOsCpuString() {
		const cpus = os.cpus();

		if (cpus.length === 0) return 'no CPU info';

		return `${cpus.length}x ${cpus[0].model} - speed: ${cpus[0].speed}`;
	}
}
