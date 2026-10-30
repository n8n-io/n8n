import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { PromotionEnvironmentRepository } from './database/repositories/promotion-environment.repository';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';

/**
 * The one place that removes local checkouts, so that cleanup on other mains and
 * the environment lock ([LIGO-1129](https://linear.app/n8n/issue/LIGO-1129)) can
 * be added here only.
 *
 * A checkout is a disposable cache, and no operation uses one that does not match
 * the stored configuration. A failed cleanup only leaves disk in use, so it logs
 * a warning and never fails the request.
 */
@Service()
export class PromotionCheckoutCleanupService {
	constructor(
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly environmentRepository: PromotionEnvironmentRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/** Removes the whole folder of a deleted environment, host keys included. */
	async removeDeletedEnvironment(environmentId: string): Promise<void> {
		try {
			await this.workingDirectory.purge(environmentId);
		} catch (error) {
			this.warn('Failed to remove the local promotion checkout', { environmentId }, error);
		}
	}

	/** Removes the checkouts and keeps the pinned SSH host keys. */
	async resetCheckouts(environmentIds: string[]): Promise<void> {
		await Promise.all(
			environmentIds.map(async (environmentId) => {
				try {
					await this.workingDirectory.resetCheckout(environmentId);
				} catch (error) {
					this.warn('Failed to reset the local promotion checkout', { environmentId }, error);
				}
			}),
		);
	}

	/** A new host URL changes the remote URL of every environment that stores a repository path. */
	async resetCheckoutsForHostChange(providerId: string): Promise<void> {
		let environmentIds: string[];
		try {
			environmentIds =
				await this.environmentRepository.findIdsWithRepositoryPathByProvider(providerId);
		} catch (error) {
			this.warn('Failed to find the promotion checkouts to reset', { providerId }, error);
			return;
		}
		await this.resetCheckouts(environmentIds);
	}

	/**
	 * Removes the folders of environments that no longer exist, for example after a
	 * failed removal. Lists the folders before it reads the database, so a folder
	 * that a new environment creates during the check is never removed.
	 */
	async removeOrphanedCheckouts(): Promise<void> {
		try {
			const folderIds = await this.workingDirectory.listEnvironmentIds();
			const existingIds = await this.environmentRepository.findExistingIds(folderIds);
			const orphanedIds = folderIds.filter((id) => !existingIds.has(id));
			if (orphanedIds.length === 0) return;
			this.logger.debug('Removing promotion checkouts of deleted environments', {
				environmentIds: orphanedIds,
			});
			for (const environmentId of orphanedIds) {
				await this.removeDeletedEnvironment(environmentId);
			}
		} catch (error) {
			this.warn('Failed to check for promotion checkouts of deleted environments', {}, error);
		}
	}

	private warn(message: string, context: Record<string, string>, error: unknown) {
		this.logger.warn(message, {
			...context,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
