import { Service } from 'typedi';
import { LessThan } from 'typeorm';
import { DateTime } from 'luxon';
import { WorkflowHistoryRepository } from '@/databases/repositories';
import { WORKFLOW_HISTORY_PRUNE_INTERVAL } from './constants';
import { getWorkflowHistoryPruneTime, isWorkflowHistoryEnabled } from './workflowHistoryHelper.ee';

@Service()
export class WorkflowHistoryManager {
	pruneTimer?: NodeJS.Timeout;

	constructor(private workflowHistoryRepo: WorkflowHistoryRepository) {}

	init() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
		}

		this.pruneTimer = setInterval(async () => this.prune(), WORKFLOW_HISTORY_PRUNE_INTERVAL);
	}

	shutdown() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = undefined;
		}
	}

	async prune() {
		if (!isWorkflowHistoryEnabled()) {
			return;
		}

		const pruneHours = getWorkflowHistoryPruneTime();
		// No prune time set
		if (pruneHours === -1) {
			return;
		}
		const pruneDateTime = DateTime.now().minus({ hours: pruneHours }).toJSDate();

		await this.workflowHistoryRepo.delete({
			createdAt: LessThan(pruneDateTime),
		});
	}
}
