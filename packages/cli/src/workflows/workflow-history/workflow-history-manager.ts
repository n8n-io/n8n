import { Time } from '@n8n/constants';
import { WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';

import { getWorkflowHistoryPruneTime } from './workflow-history-helper';

@Service()
export class WorkflowHistoryManager {
	pruneTimer?: NodeJS.Timeout;

	constructor(private workflowHistoryRepo: WorkflowHistoryRepository) {}

	init() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
		}

		this.pruneTimer = setInterval(async () => await this.prune(), 1 * Time.hours.toMilliseconds);
	}

	shutdown() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = undefined;
		}
	}

	async prune() {
		const pruneHours = getWorkflowHistoryPruneTime();
		// No prune time set (infinite retention)
		if (pruneHours === -1) {
			return;
		}
		const pruneDateTime = DateTime.now().minus({ hours: pruneHours }).toJSDate();

		await this.workflowHistoryRepo.deleteEarlierThanExceptCurrent(pruneDateTime);
	}
}
