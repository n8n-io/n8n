import { WorkerStatus } from '@n8n/api-types';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import os from 'node:os';

import { N8N_VERSION } from '@/constants';
import { Push } from '@/push';

import { JobProcessor } from './job-processor';
import { Publisher } from './pubsub/publisher.service';

@Service()
export class WorkerStatusService {
	constructor(
		private readonly jobProcessor: JobProcessor,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly push: Push,
	) {}

	async requestWorkerStatus() {
		if (this.instanceSettings.instanceType !== 'main') return;

		return await this.publisher.publishCommand({ command: 'get-worker-status' });
	}

	@OnPubSubEvent('response-to-get-worker-status', { instanceType: 'main' })
	handleWorkerStatusResponse(payload: WorkerStatus) {
		this.push.broadcast({
			type: 'sendWorkerStatusMessage',
			data: {
				workerId: payload.senderId,
				status: payload,
			},
		});
	}

	@OnPubSubEvent('get-worker-status', { instanceType: 'worker' })
	async publishWorkerResponse() {
		await this.publisher.publishWorkerResponse({
			senderId: this.instanceSettings.hostId,
			response: 'response-to-get-worker-status',
			payload: this.generateStatus(),
		});
	}

	private generateStatus(): WorkerStatus {
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
