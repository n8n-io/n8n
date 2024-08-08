import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { Service } from 'typedi';
import Heap from 'heap';

import { GlobalConfig } from '@n8n/config';
import { Logger } from '@/Logger';
import config from '@/config';
import { OnShutdown } from '@/decorators/OnShutdown';

const asyncExec = promisify(exec);

type ExecutionDir = {
	/** Absolute path to the execution dir. */
	path: string;

	/** Size (in bytes) of the execution dir. */
	size: number;

	/** Last modified time (Unix timestamp) of the execution dir. */
	mtime: number;
};

/**
 * Responsible for regularly deleting old execution-related files
 * from a target dir to keep it at or below a target size.
 */
@Service()
export class SizeBasedPruningService {
	/** Path to dir subject to size-based pruning, typically `~/.n8n/binaryData`. */
	private targetDirPath: string;

	/** Current size (in bytes) of the target dir. */
	private currentSize = 0;

	/** Max size (in bytes) allowed for the target dir. */
	private maxSize: number;

	/** Size (in bytes) to come back down to after a size-based pruning cycle. */
	private targetSize: number;

	/** How often (in milliseconds) to prune the target dir based on size. */
	private frequency: number;

	/** Min heap of execution dirs, prioritized by oldest modification time. */
	private heap: Heap<ExecutionDir>;

	private interval: NodeJS.Timer | null = null;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.targetDirPath = config.getEnv('binaryDataManager.localStoragePath');

		const { maxSize, frequency, targetRatio } = this.globalConfig.pruning.bySize;

		this.maxSize = maxSize;
		this.targetSize = maxSize * targetRatio;
		this.frequency = frequency;

		this.heap = new Heap<ExecutionDir>((a, b) => a.mtime - b.mtime);
	}

	start() {
		// @TODO: Delegate to worker thread for fewer microtasks?

		this.interval = setInterval(async () => await this.prune(), this.frequency);

		this.logger.debug('[Pruning] Started size-based pruning timer');
	}

	@OnShutdown()
	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
			this.logger.debug('[Pruning] Stopped size-based pruning timer');
		}
	}

	private async fullScan() {
		this.heap.clear();
		this.currentSize = 0;

		const workflowsDirPath = path.join(this.targetDirPath, 'workflows');
		const workflowDirs = await fs.readdir(workflowsDirPath, { withFileTypes: true });

		// @TODO: `Promise.all` might overwhelm the FS if too many dirs to check?

		for (const workflowDir of workflowDirs) {
			if (workflowDir.isDirectory()) {
				const executionsDirPath = path.join(workflowsDirPath, workflowDir.name, 'executions');
				const executionDirs = await fs.readdir(executionsDirPath, { withFileTypes: true });

				for (const executionDir of executionDirs) {
					if (executionDir.isDirectory() && /^\d+$/.test(executionDir.name)) {
						await this.trackDir(path.join(executionsDirPath, executionDir.name));
					}
				}
			}
		}
	}

	private async trackDir(dirPath: string) {
		try {
			const stats = await fs.stat(dirPath);
			const size = await this.getDirSize(dirPath);
			this.heap.push({ path: dirPath, size, mtime: stats.mtime.getTime() });
			this.currentSize += size;
		} catch (error: unknown) {
			this.logger.warn('[Pruning] Failed to track execution dir', { dirPath, error });
		}
	}

	/** Return the size of a dir in bytes. */
	private async getDirSize(dirPath: string) {
		const { stdout } = await asyncExec(`du -s "${dirPath}" | cut -f1`);

		return parseInt(stdout.trim(), 10) * 1024;
	}

	/** Delete oldest modified execution dirs until at or below target size. */
	private async prune() {
		this.logger.debug('[Pruning] Starting size-based pruning cycle');

		await this.fullScan();

		const prunedDirs: { paths: string[]; size: number } = { paths: [], size: 0 };
		const prePruneSize = this.currentSize;

		while (!this.heap.empty() && this.currentSize > this.maxSize) {
			const oldestDir = this.heap.pop();

			if (!oldestDir) break; // to satisfy TS, covered by condition

			try {
				await fs.rm(oldestDir.path, { recursive: true, force: true });
				this.currentSize -= oldestDir.size;
				prunedDirs.paths.push(oldestDir.path);
				prunedDirs.size += oldestDir.size;
			} catch (error: unknown) {
				this.logDeletionError(error, oldestDir.path);
			}

			if (this.currentSize <= this.targetSize) break;
		}

		if (prunedDirs.paths.length > 0) {
			this.logger.debug('[Pruning] Size-based pruning cycle completed', {
				prunedDirs: prunedDirs.paths,
				totalPrunedBytes: prunedDirs.size,
				prePruneSizeBytes: prePruneSize,
				postPruneSizeBytes: this.currentSize,
			});
		}
	}

	private logDeletionError(error: unknown, filePath: string) {
		if (error instanceof Error && 'code' in error) {
			switch (error.code) {
				case 'ENOENT':
					return; // already deleted manually or by non-size-based pruning, so disregard
				case 'EACCES':
				case 'EPERM':
					this.logger.error('[Pruning] Permission denied to delete dir', { filePath, error });
					return;
				case 'EBUSY':
					this.logger.warn('[Pruning] Cannot delete dir in use', { filePath, error });
					return;
			}
		}

		this.logger.error('[Pruning] Unexpected error deleting dir', { filePath, error });
	}
}
