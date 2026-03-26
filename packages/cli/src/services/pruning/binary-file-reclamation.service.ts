import { Logger } from '@n8n/backend-common';
import { BinaryFileReclamationConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings, StorageConfig } from 'n8n-core';
import { ensureError, sleep } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { EventService } from '@/events/event.service';

/**
 * Reclaims disk space by deleting binary data from completed executions
 * when filesystem usage exceeds a configurable threshold.
 *
 * Uses a high/low watermark approach:
 * - Starts deleting when usage exceeds `highWatermark * maxStorageBytes`
 * - Stops deleting when usage drops below `lowWatermark * maxStorageBytes`
 *
 * Only targets binary data on the filesystem; execution records are untouched.
 * Measures total filesystem usage (not just n8n's data) since the goal is
 * preventing the disk from filling up regardless of what's consuming space.
 */
@Service()
export class BinaryFileReclamationService {
	private checkInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private isReclaiming = false;

	private lastReclaimedAt: Date | null = null;

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

		this.checkInterval = setInterval(
			async () => await this.safeCheckAndReclaim(),
			this.config.checkIntervalMinutes * Time.minutes.toMilliseconds,
		);

		this.logger.debug(
			`Started binary file reclamation timer, checking every ${this.config.checkIntervalMinutes} minutes`,
		);
	}

	@OnLeaderStepdown()
	stopReclamation() {
		const hadTimer = this.checkInterval;

		clearInterval(this.checkInterval);
		this.checkInterval = undefined;

		if (hadTimer) this.logger.debug('Stopped binary file reclamation timer');
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopReclamation();
	}

	private async safeCheckAndReclaim() {
		if (this.isReclaiming) return;

		try {
			this.isReclaiming = true;
			await this.checkAndReclaim();
		} catch (error) {
			this.logger.error('Binary file reclamation failed', { error: ensureError(error) });
		} finally {
			this.isReclaiming = false;
		}
	}

	private async checkAndReclaim() {
		let totalBytes = await this.measureFilesystemUsage();
		const highThreshold = this.config.maxStorageBytes * this.config.highWatermark;
		const lowThreshold = this.config.maxStorageBytes * this.config.lowWatermark;

		if (totalBytes < highThreshold) {
			this.logger.debug('Storage usage within limits', {
				totalBytes,
				highThreshold,
			});
			return;
		}

		this.logger.info('Storage usage exceeds high watermark, starting reclamation', {
			totalBytes,
			highThreshold,
			lowThreshold,
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

			for (const execution of executions) {
				const binaryPath = this.getBinaryDataPath(execution.id, execution.workflowId);
				try {
					await fs.rm(binaryPath, { recursive: true, force: true });
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

			const newTotalBytes = await this.measureFilesystemUsage();
			totalBytesReclaimed += Math.max(0, totalBytes - newTotalBytes);
			totalBytes = newTotalBytes;

			if (totalBytes < lowThreshold) {
				this.logger.info('Storage usage below low watermark, stopping reclamation');
				break;
			}

			await sleep(this.config.batchDelayMs);
		}

		const durationMs = Date.now() - startTime;

		this.logger.info('Binary file reclamation complete', {
			totalBytesReclaimed,
			totalExecutionsProcessed,
			durationMs,
		});

		this.eventService.emit('binary-files-reclaimed', {
			totalBytesReclaimed,
			totalExecutionsProcessed,
			durationMs,
		});
	}

	private async measureFilesystemUsage(): Promise<number> {
		const stats = await fs.statfs(this.instanceSettings.n8nFolder);
		return (stats.blocks - stats.bfree) * stats.bsize;
	}

	private getBinaryDataPath(executionId: string, workflowId: string): string {
		return path.join(this.storagePath, 'workflows', workflowId, 'executions', executionId);
	}
}
