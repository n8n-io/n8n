import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { SelfHealingInvestigationService } from './self-healing-investigation.service';

/** Release interrupted investigations without delaying Assistant cleanup. */
@SystemTask()
export class SelfHealingReconciliationTask implements SystemTask {
	readonly name = 'self-healing-reconciliation';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(Time.minutes.toMilliseconds);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		// oxlint-disable-next-line typescript/no-deprecated -- Keep timer scheduling while the durable scheduler is disabled.
		leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
	});

	constructor(private readonly investigations: SelfHealingInvestigationService) {}

	async run(signal: AbortSignal): Promise<void> {
		if (signal.aborted) return;
		await this.investigations.reconcile(signal);
	}
}
