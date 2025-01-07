import type { WorkerStatus } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import os from 'node:os';

import { N8N_VERSION } from '@/constants';

import { JobProcessor } from './job-processor';

@Service()
export class WorkerStatusService {
	constructor(
		private readonly jobProcessor: JobProcessor,
		private readonly instanceSettings: InstanceSettings,
	) {}

	generateStatus(): WorkerStatus {
		return {
			senderId: this.instanceSettings.hostId,
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
