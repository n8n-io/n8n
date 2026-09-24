import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowDraftRepository } from './database/workflow-draft.repository';

@SystemTask()
export class WorkflowDraftCleanupTask implements SystemTask {
	readonly name = 'workflow-draft-cleanup';
	readonly schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 3600 };
	readonly effects: SystemTaskEffects = 'idempotent';
	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: false,
		runOnTakeover: true,
	};
	readonly retryDelaySeconds = 30;

	constructor(private readonly drafts: WorkflowDraftRepository) {}

	async run(signal: AbortSignal) {
		if (!signal.aborted) await this.drafts.cleanup(new Date());
	}
}
