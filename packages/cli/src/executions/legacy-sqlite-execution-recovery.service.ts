import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import assert from 'assert';

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
		}

		this.logger.debug('Legacy SQLite execution recovery completed.');
	}
}
