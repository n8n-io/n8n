import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

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

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: REGISTRY_CONSTANTS.RECONCILIATION_INTERVAL_MS / Time.seconds.toMilliseconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	readonly runOnTakeover = true;

	constructor(private readonly checkService: CheckService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.checkService.reconcile(signal);
	}
}
