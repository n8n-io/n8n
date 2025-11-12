import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { WorkflowHistoryRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { DateTime } from 'luxon';

import { getWorkflowHistoryPruneTime } from './workflow-history-helper';

@Service()
export class WorkflowHistoryManager {
	pruneTimer?: NodeJS.Timeout;
	private isPruning = false;

	constructor(
		private readonly logger: Logger,
		private workflowHistoryRepo: WorkflowHistoryRepository,
	) {
		this.logger = this.logger.scoped('pruning');
	}

	init() {
		if (this.pruneTimer !== undefined) {
			this.logger.warn(
				'WorkflowHistoryManager.init() called multiple times. Restarting prune timer.',
			);
			clearInterval(this.pruneTimer);
		}

		this.pruneTimer = setInterval(async () => await this.prune(), 1 * Time.hours.toMilliseconds);
	}

	@OnShutdown()
	shutdown() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = undefined;
		}
	}

	async prune() {
		// Prevent overlapping prune operations
		if (this.isPruning) {
			this.logger.debug('Prune operation already in progress, skipping this cycle.');
			return;
		}

		this.isPruning = true;
		try {
			const pruneHours = getWorkflowHistoryPruneTime();
			// No prune time set (infinite retention)
			if (pruneHours === -1) {
				return;
			}
			const pruneDateTime = DateTime.now().minus({ hours: pruneHours }).toJSDate();

			await this.workflowHistoryRepo.deleteEarlierThanExceptCurrent(pruneDateTime);
		} catch (error) {
			this.logger.error('Failed to prune workflow history', { error });
		} finally {
			this.isPruning = false;
		}
	}
}
