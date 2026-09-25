import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';

@SystemTask()
export class WorkflowSuggestionCleanupTask implements SystemTask {
	readonly name = 'workflow-suggestion-cleanup';
	readonly schedule: SystemTaskSchedule = { kind: 'interval', intervalSeconds: 3600 };
	readonly effects: SystemTaskEffects = 'idempotent';
	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: false,
		runOnTakeover: true,
	};
	readonly retryDelaySeconds = 30;

	constructor(private readonly suggestions: WorkflowSuggestionRepository) {}

	async run(signal: AbortSignal) {
		if (!signal.aborted) await this.suggestions.cleanup(new Date());
	}
}
