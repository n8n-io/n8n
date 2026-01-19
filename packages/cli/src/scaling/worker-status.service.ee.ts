import { WorkerStatus } from '@n8n/api-types';
import { OnPubSubEvent } from '@n8n/decorators';
import { In, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import os from 'node:os';
import process from 'node:process';

import { N8N_VERSION } from '@/constants';
import { Push } from '@/push';
import { RoleService } from '@/services/role.service';

import { JobProcessor } from './job-processor';
import { Publisher } from './pubsub/publisher.service';

@Service()
export class WorkerStatusService {
	constructor(
		private readonly jobProcessor: JobProcessor,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly push: Push,
		private readonly roleService: RoleService,
		private readonly userRepository: UserRepository,
	) {}

	async requestWorkerStatus() {
		if (this.instanceSettings.instanceType !== 'main') return;

		return await this.publisher.publishCommand({ command: 'get-worker-status' });
	}

	@OnPubSubEvent('response-to-get-worker-status', { instanceType: 'main' })
	async handleWorkerStatusResponse(payload: WorkerStatus) {
		// Get list of users authorized to view worker status
		const authorizedUserIds = await this.getAuthorizedUserIds();

		if (authorizedUserIds.length === 0) {
			return;
		}

		// Send only to authorized users
		this.push.sendToUsers(
			{
				type: 'sendWorkerStatusMessage',
				data: {
					workerId: payload.senderId,
					status: payload,
				},
			},
			authorizedUserIds,
		);
	}

	private async getAuthorizedUserIds(): Promise<string[]> {
		const rolesWithScope = await this.roleService.rolesWithScope('global', 'orchestration:read');

		if (rolesWithScope.length === 0) {
			return [];
		}

		const users = await this.userRepository.find({
			select: ['id'],
			where: {
				role: {
					slug: In(rolesWithScope),
				},
			},
		});

		return users.map((u) => u.id);
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
		const constrainedMemory = process.constrainedMemory();

		// See https://github.com/nodejs/node/issues/59227 for information about why we cap at MAX_SAFE_INTEGER
		// The number 18446744073709552000 does come back when running in a container with no constraints
		const isInContainer = constrainedMemory > 0 && constrainedMemory < Number.MAX_SAFE_INTEGER;
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
		};
	}

	private getOsCpuString() {
		const cpus = os.cpus();

		if (cpus.length === 0) return 'no CPU info';

		return `${cpus.length}x ${cpus[0].model}`;
	}
}
