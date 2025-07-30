import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionData, ExecutionRepository } from '@n8n/db';
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
			this.executionRepository.manager.connection.isInitialized,
			'The database connection must be initialized',
		);

		this.logger.debug('Starting legacy SQLite execution recovery...');

		// Find all executions that are in the 'new' state but do not have associated execution data.
		// These executions are considered invalid and will be marked as 'crashed'.
		// Since there is no join in this query the returned ids are unique.
		const invalidExecutions = await this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.status = :status', { status: 'new' })
			.andWhere(
				'NOT EXISTS (' +
					this.executionRepository.manager
						.createQueryBuilder()
						.select('1')
						.from(ExecutionData, 'execution_data')
						.where('execution_data.executionId = execution.id')
						.getQuery() +
					')',
			)
			.select('execution.id')
			.getMany();

		if (invalidExecutions.length > 0) {
			await this.executionRepository.markAsCrashed(invalidExecutions.map((e) => e.id));
			this.logger.debug(
				`Marked ${invalidExecutions.length} executions as crashed due to missing execution data.`,
			);
		}

		this.logger.debug('Legacy SQLite execution recovery completed.');
	}
}
