import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionData, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { Push } from '@/push';
import { GlobalConfig } from '@n8n/config';
import { ExecutionService } from './execution.service';

/**
 * Service for recovering executions that are missing execution data, this should only happen
 * for sqlite legacy databases.
 */
@Service()
export class LegacySqliteExecutionRecoveryService {
	private readonly legacySqlite: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly globalConfig: GlobalConfig,
	) {
		const { type: dbType, sqlite: sqliteConfig } = this.globalConfig.database;
		this.legacySqlite = dbType === 'sqlite' && sqliteConfig.poolSize === 0;
	}

	/**
	 * Recover key properties of a truncated execution using event logs.
	 */
	async cleanupWorkflowExecutions() {
		if (!this.legacySqlite) {
			return;
		}

		this.logger.info('Starting legacy SQLite execution recovery...');

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
			this.logger.info(
				`Marked ${invalidExecutions.length} executions as crashed due to missing execution data.`,
			);
		}

		this.logger.info('Legacy SQLite execution recovery completed.');
	}
}
