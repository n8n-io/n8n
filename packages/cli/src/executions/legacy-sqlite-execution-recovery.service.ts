import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, ExecutionRepository, In, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import assert from 'assert';
import { ExecutionStatus } from 'n8n-workflow';

/**
 * Service for recovering executions that are missing execution data, this should only happen
 * for sqlite legacy databases.
 */
@Service()
export class LegacySqliteExecutionRecoveryService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly dbConnection: DbConnection,
	) {
		this.logger = logger.scoped('legacy-sqlite-execution-recovery');
	}

	/**
	 * Remove workflow executions that are in the `new` state but have no associated execution data.
	 * This is a legacy recovery operation for SQLite databases where executions might be left
	 * in an inconsistent state due to missing execution data.
	 * It marks these executions as `crashed` to prevent them from being processed further.
	 * This method should only be called when we are in legacy SQLite mode.
	 */
	async cleanupWorkflowExecutions() {
		assert(this.globalConfig.database.isLegacySqlite, 'Only usable when on legacy SQLite driver');
		assert(
			this.dbConnection.connectionState.connected && this.dbConnection.connectionState.migrated,
			'The database connection must be connected and migrated before running cleanupWorkflowExecutions',
		);

		this.logger.debug('Starting legacy SQLite execution recovery...');

		const invalidExecutions = await this.executionRepository.findQueuedExecutionsWithoutData();

		if (invalidExecutions.length > 0) {
			await this.executionRepository.markAsCrashed(invalidExecutions.map((e) => e.id));
			this.logger.debug(
				`Marked ${invalidExecutions.length} executions as crashed due to missing execution data.`,
			);

			if (this.globalConfig.executions.legacyRecovery.enableWorkflowDeactivation) {
				const uniqueWorkflowIds = [...new Set(invalidExecutions.map((e) => e.workflowId))];
				for (const workflowId of uniqueWorkflowIds) {
					const lastExecutions = await this.executionRepository.findMultipleExecutions({
						where: { workflowId },
						order: { startedAt: 'DESC' },
						take: this.globalConfig.executions.legacyRecovery.maxLastExecutions,
					});
					const numberOfCrashedExecutions = lastExecutions.filter(
						(e) => e.status === 'crashed',
					).length;

					// If all of the last executions are crashed, we deactivate the workflow
					// and mark the pending executions as crashed.
					if (lastExecutions.length === numberOfCrashedExecutions) {
						await this.workflowRepository.deactivate(workflowId);
						this.logger.warn(`Disabled workflow ${workflowId} due to too many crashed executions.`);
						const pendingExecutions = await this.executionRepository.findMultipleExecutions({
							where: { workflowId, status: In(['running', 'new'] as ExecutionStatus[]) },
						});
						if (pendingExecutions.length > 0) {
							await this.executionRepository.markAsCrashed(pendingExecutions.map((e) => e.id));
							this.logger.debug(
								`Marked ${pendingExecutions.length} pending executions as crashed due to workflow deactivation.`,
							);
						}
						// TODO: Inform user about the deactivation
					}
				}
			}
		}

		this.logger.debug('Legacy SQLite execution recovery completed.');
	}
}
