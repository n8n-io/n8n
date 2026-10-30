import type { PromotionEnvironmentRemote } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { PromotionEnvironment } from './database/entities/promotion-environment.entity';
import { PromotionEnvironmentRepository } from './database/repositories/promotion-environment.repository';
import { resolvePromotionGitRemote } from './git-hosts/git-host-remote';
import { resolveStoredConfig } from './promotion-config-settings';
import {
	PromotionEnvironmentLockService,
	throwIfLockLost,
} from './promotion-environment-lock.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { buildCacheDescriptor } from './promotions-git.utils';

type CleanupCommand = PubSubCommandMap['promotion-checkout-cleanup'];

type CleanupReason = CleanupCommand['reason'];

/**
 * The one place that removes local checkouts.
 *
 * A request that cleans up runs its database change through this service. The service
 * takes the environment lock before the change, removes the descriptor and moves the
 * folders to trash inside the lock. It deletes the trash and publishes to the other
 * mains after it releases the lock, so the environment is not busy when the other
 * mains get the message.
 *
 * The startup check and the messages from other mains take no lock: with a lock that
 * does not wait, mains that get the same message would skip each other's cleanup.
 *
 * A checkout is a disposable cache, and no operation uses one that does not match
 * the stored configuration. A failed removal only leaves disk in use, so it logs
 * a warning and never fails the request.
 */
@Service()
export class PromotionCheckoutCleanupService {
	constructor(
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly environmentRepository: PromotionEnvironmentRepository,
		private readonly environmentLock: PromotionEnvironmentLockService,
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Runs `deleteRows` inside the environment lock, then removes the whole folder. Also
	 * removes the host keys, because a deleted environment cannot connect again.
	 */
	async deleteEnvironment<T>(environmentId: string, deleteRows: () => Promise<T>): Promise<T> {
		return await this.changeThenRemove([environmentId], 'deleted', deleteRows);
	}

	/**
	 * Runs `resolveAgain` inside the environment lock, then resets the checkout. Nothing
	 * changes in the database, so a lost lock stops the request before the removal.
	 */
	async disconnect<T>(environmentId: string, resolveAgain: () => Promise<T>): Promise<T> {
		const { result, trashed } = await this.holdLocks([environmentId], async ([signal]) => {
			const resolved = await resolveAgain();
			throwIfLockLost(signal);
			return { result: resolved, trashed: await this.removeLocally([environmentId], 'reset') };
		});
		await this.finish(trashed, [environmentId], 'disconnected');
		return result;
	}

	/** Runs `update` inside the environment lock, then resets the checkout. */
	async changeCheckoutSettings<T>(environmentId: string, update: () => Promise<T>): Promise<T> {
		return await this.changeThenRemove([environmentId], 'settings-changed', update);
	}

	/**
	 * A new host URL changes the remote URL of every environment that stores a repository
	 * path. Takes one lock for each of them, then runs `update` and resets their checkouts.
	 */
	async changeHostUrl<T>(providerId: string, update: () => Promise<T>): Promise<T> {
		const environmentIds =
			await this.environmentRepository.findIdsWithRepositoryPathByProvider(providerId);
		return await this.changeThenRemove(environmentIds, 'settings-changed', update);
	}

	/**
	 * Catches the folders that a failed removal, a crash, or a lost message leaves
	 * behind: the trash, and the folders of deleted environments. Lists the folders
	 * before it reads the database, so a folder that a new environment creates during
	 * the check is never removed. Every main runs it, so it does not publish.
	 */
	async removeOrphanedCheckouts(): Promise<void> {
		try {
			await this.workingDirectory.emptyTrash();
		} catch (error) {
			this.warn('Failed to delete the promotion checkouts in the trash', {}, error);
		}
		try {
			const folderIds = await this.workingDirectory.listEnvironmentIds();
			const existingIds = await this.environmentRepository.findExistingIds(folderIds);
			const orphanedIds = folderIds.filter((id) => !existingIds.has(id));
			if (orphanedIds.length === 0) return;
			this.logger.debug('Removing promotion checkouts of deleted environments', {
				environmentIds: orphanedIds,
			});
			for (const environmentId of orphanedIds) {
				await this.purge(environmentId);
			}
		} catch (error) {
			this.warn('Failed to check for promotion checkouts of deleted environments', {}, error);
		}
	}

	/**
	 * The message can arrive late or twice, so this reads the database first and
	 * removes only a checkout that is no longer current. It never publishes, so
	 * messages cannot loop.
	 */
	@OnPubSubEvent('promotion-checkout-cleanup', { instanceType: 'main' })
	async handleCleanupFromOtherMain({ environmentIds, reason }: CleanupCommand): Promise<void> {
		try {
			if (reason === 'deleted') {
				await this.purgeIfDeleted(environmentIds);
			} else if (reason === 'disconnected') {
				// The database stores no connected state, so there is nothing to check.
				await this.reset(environmentIds);
			} else {
				await Promise.all(environmentIds.map(async (id) => await this.resetIfStale(id)));
			}
		} catch (error) {
			this.warn(
				'Failed to clean up the promotion checkouts for another main',
				{ environmentIds, reason },
				error,
			);
		}
	}

	private async purgeIfDeleted(environmentIds: string[]) {
		const existingIds = await this.environmentRepository.findExistingIds(environmentIds);
		for (const environmentId of environmentIds) {
			if (existingIds.has(environmentId)) {
				this.logger.warn('Kept the promotion checkout of an environment that still exists', {
					environmentId,
				});
				continue;
			}
			await this.purge(environmentId);
		}
	}

	private async resetIfStale(environmentId: string) {
		try {
			const environment = await this.environmentRepository.findByIdWithProvider(environmentId);
			if (!environment) {
				await this.purge(environmentId);
				return;
			}
			// No descriptor means that a clone is in progress or that no operation trusts the
			// checkout, so a reset could remove a clone that still runs.
			if (!(await this.workingDirectory.readDescriptor(environmentId))) return;
			if (!(await this.matchesCurrentSettings(environment))) await this.reset([environmentId]);
		} catch (error) {
			this.warn('Failed to check the local promotion checkout', { environmentId }, error);
		}
	}

	/**
	 * Same check as `checkoutStateFor`, so the reported state and the cleanup agree.
	 * Settings or a remote that this version cannot read do not match, because no
	 * operation can use that checkout.
	 */
	private async matchesCurrentSettings(environment: PromotionEnvironment): Promise<boolean> {
		const config = resolveStoredConfig(environment);
		if (!config) return false;
		let remote: PromotionEnvironmentRemote;
		try {
			remote = resolvePromotionGitRemote(environment.provider, environment.remote);
		} catch {
			return false;
		}
		return await this.workingDirectory.matchesDescriptor(
			buildCacheDescriptor({ environmentId: environment.id, remote, config }),
		);
	}

	/**
	 * A lost lock before the change stops the request, so nothing changes. After the
	 * change, the request finishes. It keeps the folder of an environment whose lock it
	 * lost, because another operation can now hold that lock on the new settings.
	 */
	private async changeThenRemove<T>(
		environmentIds: string[],
		reason: CleanupReason,
		change: () => Promise<T>,
	): Promise<T> {
		const removal = reason === 'deleted' ? 'purge' : 'reset';
		const { result, trashed } = await this.holdLocks(environmentIds, async (signals) => {
			signals.forEach(throwIfLockLost);
			const changed = await change();
			const keptIds = environmentIds.filter((_, index) => signals[index].aborted);
			if (keptIds.length > 0) {
				this.logger.warn(
					'Kept the local promotion checkout because n8n lost its lock on the environment',
					{ environmentIds: keptIds },
				);
			}
			const removableIds = environmentIds.filter((_, index) => !signals[index].aborted);
			return { result: changed, trashed: await this.removeLocally(removableIds, removal) };
		});
		await this.finish(trashed, environmentIds, reason);
		return result;
	}

	/**
	 * Takes the locks one after the other. A busy lock fails at once with 423 and releases
	 * the locks already held, so the order cannot deadlock.
	 */
	private async holdLocks<T>(
		environmentIds: string[],
		fn: (signals: AbortSignal[]) => Promise<T>,
		signals: AbortSignal[] = [],
	): Promise<T> {
		if (signals.length === environmentIds.length) return await fn(signals);
		return await this.environmentLock.run(
			environmentIds[signals.length],
			async (signal) => await this.holdLocks(environmentIds, fn, [...signals, signal]),
		);
	}

	/** Runs after the locks are released. */
	private async finish(trashed: string[], environmentIds: string[], reason: CleanupReason) {
		await this.deleteTrash(trashed);
		this.publishToOtherMains(environmentIds, reason);
	}

	/** For the paths without a lock. */
	private async purge(environmentId: string) {
		await this.deleteTrash(await this.removeLocally([environmentId], 'purge'));
	}

	/** For the paths without a lock. */
	private async reset(environmentIds: string[]) {
		await this.deleteTrash(await this.removeLocally(environmentIds, 'reset'));
	}

	/** Removes the descriptors and moves the folders to trash. Returns the trash folders. */
	private async removeLocally(
		environmentIds: string[],
		removal: 'purge' | 'reset',
	): Promise<string[]> {
		const trashed = await Promise.all(
			environmentIds.map(async (environmentId) => {
				try {
					return removal === 'purge'
						? await this.workingDirectory.purge(environmentId)
						: await this.workingDirectory.resetCheckout(environmentId);
				} catch (error) {
					this.warn(
						removal === 'purge'
							? 'Failed to remove the local promotion checkout'
							: 'Failed to reset the local promotion checkout',
						{ environmentId },
						error,
					);
					return [];
				}
			}),
		);
		return trashed.flat();
	}

	private async deleteTrash(trashed: string[]) {
		if (trashed.length === 0) return;
		try {
			await this.workingDirectory.deleteTrash(trashed);
		} catch (error) {
			this.warn('Failed to delete the promotion checkouts in the trash', { trashed }, error);
		}
	}

	/**
	 * A lost message only leaves disk in use, and the startup check removes the
	 * folders of deleted environments, so the request does not wait for the publish.
	 */
	private publishToOtherMains(environmentIds: string[], reason: CleanupReason) {
		if (!this.instanceSettings.isMultiMain || environmentIds.length === 0) return;
		void this.publisher
			.publishCommand({
				command: 'promotion-checkout-cleanup',
				payload: { environmentIds, reason },
			})
			.catch((error: unknown) => {
				this.warn(
					'Failed to ask the other mains to remove their promotion checkouts',
					{ environmentIds, reason },
					error,
				);
			});
	}

	private warn(message: string, context: Record<string, unknown>, error: unknown) {
		this.logger.warn(message, {
			...context,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
