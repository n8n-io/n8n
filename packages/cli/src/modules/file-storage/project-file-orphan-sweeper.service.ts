import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { BinaryDataRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { ProjectFileStore } from './project-file-store';
import { ProjectFileRepository } from './project-file.repository';

/**
 * Reconciles stored bytes against the `project_files` rows: replaced files'
 * old keys, crashed replaces, and deleted files' bytes all become orphans
 * (rows are the source of truth and always change first).
 *
 * Deletion is two-pass — a key found unreferenced is only marked, and deleted
 * on the next run if still unreferenced. Age alone can't protect replace
 * races: a replaced file's old key is usually already older than any grace
 * window the moment it becomes orphaned. A freshness filter additionally
 * skips keys younger than the temp-upload age, so writes racing their row
 * insert are never marked.
 *
 * Leader-gated (not just instance-type-gated) so multi-main deployments run
 * exactly one sweeper. Only the currently configured backend is swept:
 * switching N8N_FILE_STORAGE_MODE leaves old-backend keys unswept — rows
 * persist `storedAt`, so those files keep resolving.
 */
@Service()
export class ProjectFileOrphanSweeperService {
	private sweepInterval?: NodeJS.Timeout;

	/** Keys marked unreferenced on the previous pass. */
	private markedKeys = new Set<string>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly store: ProjectFileStore,
		private readonly repository: ProjectFileRepository,
		private readonly binaryDataRepository: BinaryDataRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('file-storage');
	}

	start() {
		if (this.instanceSettings.instanceType !== 'main') return;
		if (this.instanceSettings.isLeader) this.startSweepTimer();
	}

	@OnLeaderTakeover()
	startSweepTimer() {
		if (this.instanceSettings.instanceType !== 'main') return;
		this.sweepInterval = setInterval(() => {
			void this.sweep();
		}, this.globalConfig.fileStorage.orphanSweepIntervalMs);
	}

	@OnLeaderStepdown()
	stopSweepTimer() {
		if (this.sweepInterval) {
			clearInterval(this.sweepInterval);
			this.sweepInterval = undefined;
		}
		this.markedKeys.clear();
	}

	shutdown() {
		this.stopSweepTimer();
	}

	async sweep(now = new Date()): Promise<void> {
		try {
			const orphans =
				this.store.mode === 'db'
					? await this.findDbModeOrphans(now)
					: await this.findByteStoreOrphans(now);

			const toDelete = orphans.filter((key) => this.markedKeys.has(key));
			this.markedKeys = new Set(orphans.filter((key) => !this.markedKeys.has(key)));

			if (toDelete.length === 0) return;

			if (this.store.mode === 'db') {
				await this.binaryDataRepository.deleteByFileIds(toDelete);
			} else {
				await this.store.delete(
					toDelete.map((storageKey) => ({ storedAt: this.store.mode, storageKey })),
				);
			}
			this.logger.info('Reclaimed orphaned file-storage keys', { count: toDelete.length });
		} catch (error) {
			this.logger.warn('File-storage orphan sweep failed', { error });
		}
	}

	// private methods

	private isOldEnough(lastModified: Date, now: Date): boolean {
		// Writes racing their row insert must never be marked.
		return now.getTime() - lastModified.getTime() > this.globalConfig.fileStorage.fileMaxAgeMs;
	}

	private async findByteStoreOrphans(now: Date): Promise<string[]> {
		const entries = await this.store.listStoredKeys();
		if (entries.length === 0) return [];

		const liveKeys = new Set(await this.repository.findAllStorageKeys(this.store.mode));
		return entries
			.filter((entry) => !liveKeys.has(entry.key) && this.isOldEnough(entry.lastModified, now))
			.map((entry) => entry.key);
	}

	private async findDbModeOrphans(now: Date): Promise<string[]> {
		const cutoff = new Date(now.getTime() - this.globalConfig.fileStorage.fileMaxAgeMs);
		const rows = await this.binaryDataRepository.findBySourceTypeOlderThan('project_file', cutoff);
		if (rows.length === 0) return [];

		const liveKeys = new Set(await this.repository.findAllStorageKeys('db'));
		return rows.filter((row) => !liveKeys.has(row.fileId)).map((row) => row.fileId);
	}
}
