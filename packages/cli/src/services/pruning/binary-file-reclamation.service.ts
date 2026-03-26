import { Logger } from '@n8n/backend-common';
import { BinaryFileReclamationConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings, StorageConfig } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { EventService } from '@/events/event.service';

/**
 * Reclaims disk space by deleting binary data from completed executions
 * when the binary data storage directory exceeds a configurable size limit.
 *
 * Checks on a rolling schedule. When the directory exceeds `maxStorageBytes`,
 * deletes oldest execution binary data until size drops below
 * `targetRatio * maxStorageBytes`. Execution records are untouched.
 */
@Service()
export class BinaryFileReclamationService {
	private checkTimeout: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private lastReclaimedAt: Date | null = null;

	private readonly checkRate: number;

	private readonly storagePath: string;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionRepository: ExecutionRepository,
		private readonly config: BinaryFileReclamationConfig,
		private readonly storageConfig: StorageConfig,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('binary-file-reclamation');
		this.storagePath = this.storageConfig.storagePath;
		this.checkRate = this.config.checkIntervalMinutes * Time.minutes.toMilliseconds;
	}

	init() {
		if (this.instanceSettings.isLeader) this.startReclamation();
	}

	get isEnabled() {
		return (
			this.config.enabled &&
			this.config.maxStorageBytes > 0 &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isLeader
		);
	}

	@OnLeaderTakeover()
	startReclamation() {
		if (!this.isEnabled || this.isShuttingDown) return;

		this.scheduleNextCheck();

		this.logger.debug(
			`Started binary file reclamation, checking every ${this.config.checkIntervalMinutes} minutes`,
		);
	}

	@OnLeaderStepdown()
	stopReclamation() {
		const hadTimer = this.checkTimeout;

		clearTimeout(this.checkTimeout);
		this.checkTimeout = undefined;

		if (hadTimer) this.logger.debug('Stopped binary file reclamation timer');
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopReclamation();
	}

	private scheduleNextCheck(rateMs = this.checkRate) {
		this.checkTimeout = setTimeout(() => {
			this.checkAndReclaim()
				.then(() => this.scheduleNextCheck())
				.catch((error) => {
					this.scheduleNextCheck();
					this.logger.error('Binary file reclamation failed', { error: ensureError(error) });
				});
		}, rateMs);
	}

	private async checkAndReclaim() {
		let currentSize = await this.getDirectorySize(this.storagePath);
		const threshold = this.config.maxStorageBytes;
		const target = this.config.maxStorageBytes * this.config.targetRatio;

		if (currentSize < threshold) {
			this.logger.debug('Binary data storage within limits', { currentSize, threshold });
			return;
		}

		this.logger.info('Binary data storage exceeds threshold, starting reclamation', {
			currentSize,
			threshold,
			target,
		});

		let totalBytesReclaimed = 0;
		let totalExecutionsProcessed = 0;
		const startTime = Date.now();

		while (!this.isShuttingDown) {
			const executions = await this.executionRepository.findCompletedExecutionsOldestFirst(
				this.config.batchSize,
				this.lastReclaimedAt ?? undefined,
			);

			if (executions.length === 0) {
				this.logger.debug('No more completed executions to process');
				break;
			}

			let batchBytesReclaimed = 0;

			for (const execution of executions) {
				const binaryPath = this.getBinaryDataPath(execution.id, execution.workflowId);
				const dirSize = await this.getDirectorySize(binaryPath);
				try {
					await fs.rm(binaryPath, { recursive: true, force: true });
					batchBytesReclaimed += dirSize;
				} catch (error) {
					this.logger.debug('Failed to remove binary data', {
						executionId: execution.id,
						error: ensureError(error),
					});
				}
			}

			const newestExecution = executions[executions.length - 1];
			totalExecutionsProcessed += executions.length;

			if (newestExecution.stoppedAt) {
				this.lastReclaimedAt = newestExecution.stoppedAt;
			}

			totalBytesReclaimed += batchBytesReclaimed;
			currentSize -= batchBytesReclaimed;

			if (currentSize < target) {
				this.logger.info('Binary data storage below target, stopping reclamation');
				break;
			}
		}

		this.eventService.emit('binary-files-reclaimed', {
			totalBytesReclaimed,
			totalExecutionsProcessed,
			durationMs: Date.now() - startTime,
		});
	}

	private async getDirectorySize(dirPath: string): Promise<number> {
		let entries;
		try {
			entries = await fs.readdir(dirPath, { withFileTypes: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
			throw error;
		}

		let totalSize = 0;
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isDirectory()) {
				totalSize += await this.getDirectorySize(fullPath);
			} else {
				const stats = await fs.stat(fullPath);
				totalSize += stats.size;
			}
		}
		return totalSize;
	}

	private getBinaryDataPath(executionId: string, workflowId: string): string {
		return path.join(this.storagePath, 'workflows', workflowId, 'executions', executionId);
	}
}
