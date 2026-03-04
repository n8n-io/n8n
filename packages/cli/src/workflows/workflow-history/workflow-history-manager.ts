import { Time } from '@n8n/constants';
import { WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';

import { License } from '@/license';

import { getWorkflowHistoryPruneTime } from './workflow-history-helper';

@Service()
export class WorkflowHistoryManager {
	pruneTimer?: NodeJS.Timeout;

	constructor(
		private workflowHistoryRepo: WorkflowHistoryRepository,
		private license: License,
	) {}

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

		const preserveNamedVersions = this.license.isLicensed('feat:namedVersions');
		await this.workflowHistoryRepo.deleteEarlierThanExceptCurrentAndActive(
			pruneDateTime,
			preserveNamedVersions,
		);
	}
}
