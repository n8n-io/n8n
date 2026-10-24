import { Logger } from '@n8n/backend-common';
import { ScheduledTaskRepository } from '@n8n/db';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { LeaseService } from '@n8n/leases';
import type { LeaseKind } from '@n8n/leases';
import { InstanceSettings } from 'n8n-core';

import { DurableSchedulerLeaseProvider } from './durable-scheduler-lease-provider';
import { DurableScheduler } from '../durable-scheduler';
import { HeldTaskProvisioner } from '../held-tasks/held-task-provisioner';

/**
 * The instance's {@link LeaseService}, backed by the durable scheduler's held
 * tasks. Available only on a main that runs held tasks.
 */
@Service()
export class ClusterLeases {
	private readonly service: LeaseService<OperationContext> | undefined;

	constructor(
		private readonly logger: Logger,
		scheduler: DurableScheduler,
		provisioner: HeldTaskProvisioner,
		fence: ScheduledTaskRepository,
		instanceSettings: InstanceSettings,
	) {
		this.service = scheduler.holdsTasks()
			? new LeaseService(
					new DurableSchedulerLeaseProvider(scheduler, provisioner, fence, instanceSettings.hostId),
				)
			: undefined;
	}

	isAvailable(): boolean {
		return this.service !== undefined;
	}

	/** Register before {@link start}, so the first sync includes the kind. */
	registerKind(kind: LeaseKind<OperationContext>): void {
		this.service?.registerKind(kind);
	}

	async changed(kind: string, keys?: readonly string[]): Promise<void> {
		await this.service?.changed(kind, keys);
	}

	/** Sync every kind once. Run after the scheduler starts. */
	async start(): Promise<void> {
		try {
			await this.service?.syncAll();
		} catch (error) {
			this.logger.error('Could not sync leases at startup', { error });
		}
	}
}
