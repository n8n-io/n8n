import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { CheckService } from './check.service';
import { REGISTRY_CONSTANTS } from '../instance-registry.types';

/**
 * Inspects the instance registry for cluster drift (duplicate leaders, version
 * mismatches, duplicated identities) and raises warnings, audit events, and
 * push notifications.
 */
@SystemTask()
export class InstanceRegistryReconciliationTask implements SystemTask {
	readonly name = 'instance-registry-reconciliation';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_SECONDS,
	);

	readonly target = {
		scope: 'cluster',
		scheduler: { maxAttempts: 1 },
		leaderTimer: { runOnTakeover: true },
	} satisfies SystemTaskTarget;

	constructor(private readonly checkService: CheckService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.checkService.reconcile(signal);
	}
}
