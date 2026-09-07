import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { DataTableTriggerSubscriptionReconciler } from '@/workflows/publication/data-table-trigger-subscription-reconciler';

@SystemTask()
export class DataTableTriggerReconciliationTask implements SystemTask {
	readonly name = 'data-table-trigger-reconciliation';

	readonly schedule: SystemTaskSchedule = {
		kind: 'interval',
		intervalSeconds: 5 * Time.minutes.toSeconds,
	};

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	readonly runOnTakeover = true;

	constructor(private readonly reconciler: DataTableTriggerSubscriptionReconciler) {}

	async run(_signal: AbortSignal): Promise<void> {
		await this.reconciler.reconcileAll();
	}
}
