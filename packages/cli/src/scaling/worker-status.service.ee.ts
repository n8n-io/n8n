import { WorkerStatus } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import os from 'node:os';
import process from 'node:process';

import { N8N_VERSION } from '@/constants';
import { Push } from '@/push';
import { getMemoryLimit } from '@/utils/container-limits';

import { JobProcessor } from './job-processor';
import { Publisher } from './pubsub/publisher.service';
import { resolveQueueName, resolveWorkerPoolName } from './queue-name';

@Service()
export class WorkerStatusService {
	constructor(
		private readonly jobProcessor: JobProcessor,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly push: Push,
	) {}

	async requestWorkerStatus(requestingUserId: string) {
		if (this.instanceSettings.instanceType !== 'main') return;

		return await this.publisher.publishCommand({
			command: 'get-worker-status',
			payload: { requestingUserId },
		});
	}

	@OnPubSubEvent('response-to-get-worker-status', { instanceType: 'main' })
	handleWorkerStatusResponse(payload: WorkerStatus & { requestingUserId: string }) {
		// Send only to the user who requested worker status
		this.push.sendToUsers(
			{
				type: 'sendWorkerStatusMessage',
				data: {
					workerId: payload.senderId,
					status: payload,
				},
			},
			[payload.requestingUserId],
		);
	}

	@OnPubSubEvent('get-worker-status', { instanceType: 'worker' })
	async publishWorkerResponse(command: { requestingUserId: string }) {
		await this.publisher.publishWorkerResponse({
			senderId: this.instanceSettings.hostId,
			response: 'response-to-get-worker-status',
			payload: {
				...this.generateStatus(),
				requestingUserId: command.requestingUserId,
			},
		});
	}

	private generateStatus(): WorkerStatus {
		const isInContainer = getMemoryLimit() !== null;
		return {
			senderId: this.instanceSettings.hostId,
			runningJobsSummary: this.jobProcessor.getRunningJobsSummary(),
			isInContainer,
			process: {
				memory: {
					available: process.availableMemory(),
					constraint: process.constrainedMemory(),
					...process.memoryUsage(),
				},
				uptime: process.uptime(),
			},
			host: {
				memory: {
					total: os.totalmem(),
					free: os.freemem(),
				},
			},
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
			poolName: resolveWorkerPoolName(this.globalConfig.queue.workerPool),
			queueName: resolveQueueName(
				this.instanceSettings.instanceType,
				resolveWorkerPoolName(this.globalConfig.queue.workerPool),
			),
		};
	}

	private getOsCpuString() {
		const cpus = os.cpus();

		if (cpus.length === 0) return 'no CPU info';

		return `${cpus.length}x ${cpus[0].model}`;
	}
}
