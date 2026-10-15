import { InstanceAiConfig } from '@n8n/config';
import { clusterTarget, intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { SelfHealingInvestigationService } from './self-healing-investigation.service';

/** Retry saved investigations without delaying Assistant cleanup. */
@SystemTask()
export class SelfHealingReconciliationTask implements SystemTask {
	readonly name = 'self-healing-reconciliation';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.instanceAiConfig.pruneInterval,
	);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	});

	constructor(
		private readonly instanceAiConfig: InstanceAiConfig,
		private readonly investigations: SelfHealingInvestigationService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		if (signal.aborted) return;
		await this.investigations.reconcile(signal);
	}
}
