import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { sleep, UnexpectedError } from 'n8n-workflow';

import { ScalingService } from './scaling.service';

@Service()
export class WorkerDrainService {
	private draining = false;

	private enterDrainPromise?: Promise<void>;

	private readonly pollIntervalMs = 500;

	constructor(
		private readonly logger: Logger,
		private readonly scalingService: ScalingService,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	isDraining(): boolean {
		return this.draining;
	}

	@OnPubSubEvent('drain-worker', { instanceType: 'worker' })
	async handleDrainWorkerEvent(): Promise<void> {
		await this.enterDrain();
	}

	@OnPubSubEvent('resume-worker', { instanceType: 'worker' })
	async handleResumeWorkerEvent(): Promise<void> {
		await this.exitDrain();
	}

	async enterDrain(): Promise<void> {
		this.assertWorker();
		if (this.draining) return;
		if (this.enterDrainPromise) return this.enterDrainPromise;

		this.logger.info('[Worker] Drain signal received. Stopping new job intake.');

		this.enterDrainPromise = (async () => {
			await this.scalingService.pauseLocalQueue();
			this.draining = true;
			void this.watchForActiveJobsToFinish();
		})().finally(() => {
			this.enterDrainPromise = undefined;
		});

		return this.enterDrainPromise;
	}

	async exitDrain(): Promise<void> {
		this.assertWorker();
		if (!this.draining) {
			this.logger.warn('[Worker] Resume signal received but worker is not draining. No-op.');
			return;
		}

		await this.scalingService.resumeLocalQueue();
		this.draining = false;
		this.logger.info('[Worker] Resume signal received. Accepting new jobs.');
	}

	async waitForActiveJobsToFinish(deadlineMs: number): Promise<void> {
		const start = Date.now();
		while (this.scalingService.getRunningJobsCount() > 0) {
			if (Date.now() - start >= deadlineMs) return;
			await sleep(this.pollIntervalMs);
		}
	}

	private async watchForActiveJobsToFinish(): Promise<void> {
		while (this.draining && this.scalingService.getRunningJobsCount() > 0) {
			await sleep(this.pollIntervalMs);
		}
		if (this.draining) {
			this.logger.info('[Worker] Drain complete. No active executions remaining.');
		}
	}

	private assertWorker() {
		if (this.instanceSettings.instanceType !== 'worker') {
			throw new UnexpectedError('WorkerDrainService is only valid on a worker instance');
		}
	}
}
