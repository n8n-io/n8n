import { Logger } from '@n8n/backend-common';
import { BinaryDataPruningConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository, DbConnection } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { BinaryDataConfig, BinaryDataService, InstanceSettings } from 'n8n-core';
import { ensureError, UnexpectedError } from 'n8n-workflow';
import { strict } from 'node:assert';

const MiB = 1024 * 1024;

/**
 * Responsible for deleting binary data files from disk when total storage
 * exceeds a configurable quota.
 *
 * - Disabled by default (quota = 0). Opt-in via N8N_BINARY_DATA_STORAGE_QUOTA_MIB.
 * - Only works in filesystem binary data mode.
 * - Walks executions oldest-first (by DB ID) and deletes their binary data
 *   directories until usage drops below the quota.
 * - Tracks a cursor in memory to avoid re-scanning already-pruned executions.
 * - On restart, short-circuits by checking file existence to fast-forward
 *   the cursor past already-cleaned executions.
 */
@Service()
export class BinaryDataPruningService {
	private pruningTimeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	/** Cursor: ID of the newest execution whose binary data has been pruned. */
	private lastPrunedExecutionId: string | undefined;

	private readonly intervalMs: number;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbConnection: DbConnection,
		private readonly executionRepository: ExecutionRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly pruningConfig: BinaryDataPruningConfig,
	) {
		this.logger = this.logger.scoped('pruning');
		this.intervalMs = this.pruningConfig.intervalMinutes * Time.minutes.toMilliseconds;
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.pruningConfig.quotaMiB > 0 && this.binaryDataConfig.mode !== 'filesystem') {
			throw new UnexpectedError(
				`N8N_BINARY_DATA_STORAGE_QUOTA_MIB is set but binary data mode is '${this.binaryDataConfig.mode}'. ` +
					'Binary data pruning is only supported in filesystem mode.',
			);
		}

		if (this.instanceSettings.isLeader) this.startPruning();
	}

	get isEnabled() {
		return (
			this.pruningConfig.quotaMiB > 0 &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader
		);
	}

	@OnLeaderTakeover()
	startPruning() {
		const { connectionState } = this.dbConnection;
		if (!this.isEnabled || !connectionState.migrated || this.isShuttingDown) return;

		this.scheduleNextPruning();

		this.logger.debug('Started binary data pruning timer');
	}

	@OnLeaderStepdown()
	stopPruning() {
		if (this.pruningTimeout) {
			clearTimeout(this.pruningTimeout);
			this.pruningTimeout = undefined;
			this.logger.debug('Stopped binary data pruning timer');
		}
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopPruning();
	}

	private scheduleNextPruning(delayMs = this.intervalMs) {
		this.pruningTimeout = setTimeout(() => {
			this.prune()
				.then((nextDelay) => this.scheduleNextPruning(nextDelay))
				.catch((error) => {
					this.scheduleNextPruning(1 * Time.seconds.toMilliseconds);
					this.logger.error('Failed to prune binary data', { error: ensureError(error) });
				});
		}, delayMs);

		this.logger.debug(
			`Next binary data pruning check in ${delayMs * Time.milliseconds.toMinutes} minutes`,
		);
	}

	/**
	 * Main pruning loop. Checks total storage size, then deletes binary data
	 * for the oldest executions until under quota.
	 *
	 * @returns Delay in milliseconds until next pruning check
	 */
	async prune(): Promise<number> {
		const quotaBytes = this.pruningConfig.quotaMiB * MiB;
		const totalBytes = await this.binaryDataService.getTotalStorageSize();

		if (totalBytes <= quotaBytes) {
			this.logger.debug('Binary data within quota', {
				usedMiB: Math.round(totalBytes / MiB),
				quotaMiB: this.pruningConfig.quotaMiB,
			});
			return this.intervalMs;
		}

		this.logger.info('Binary data exceeds quota, pruning oldest executions', {
			usedMiB: Math.round(totalBytes / MiB),
			quotaMiB: this.pruningConfig.quotaMiB,
		});

		const executions = await this.executionRepository.findCompletedExecutionsAfter(
			this.lastPrunedExecutionId,
			this.pruningConfig.batchSize,
		);

		if (executions.length === 0) {
			this.logger.debug('No more executions to prune binary data for');
			return this.intervalMs;
		}

		// On restart (no cursor), fast-forward past executions whose binary data
		// is already gone by checking the last execution in the batch.
		if (this.lastPrunedExecutionId === undefined) {
			const last = executions[executions.length - 1];
			const dirExists = await this.executionBinaryDataExists(last.workflowId, last.executionId);

			if (!dirExists) {
				this.lastPrunedExecutionId = last.executionId;
				this.logger.debug('Fast-forwarding cursor past already-pruned executions', {
					cursor: this.lastPrunedExecutionId,
				});
				return 1 * Time.seconds.toMilliseconds;
			}
		}

		const locations = executions.map(({ executionId, workflowId }) => ({
			type: 'execution' as const,
			workflowId,
			executionId,
		}));

		await this.binaryDataService.deleteMany(locations);

		this.lastPrunedExecutionId = executions[executions.length - 1].executionId;

		this.logger.info('Pruned binary data', { deletedExecutions: executions.length });

		// Re-check size to decide scheduling
		const newTotalBytes = await this.binaryDataService.getTotalStorageSize();

		if (newTotalBytes > quotaBytes) {
			return 1 * Time.seconds.toMilliseconds;
		}

		return this.intervalMs;
	}

	private async executionBinaryDataExists(
		workflowId: string,
		executionId: string,
	): Promise<boolean> {
		return await this.binaryDataService.locationExists({
			type: 'execution',
			workflowId,
			executionId,
		});
	}
}
