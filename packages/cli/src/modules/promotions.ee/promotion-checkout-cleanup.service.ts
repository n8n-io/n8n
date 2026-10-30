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
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { buildCacheDescriptor } from './promotions-git.utils';

type CleanupCommand = PubSubCommandMap['promotion-checkout-cleanup'];

type CleanupReason = CleanupCommand['reason'];

/**
 * The one place that removes local checkouts, so that the environment lock
 * ([LIGO-1129](https://linear.app/n8n/issue/LIGO-1129)) can be added here only.
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
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/** Also removes the host keys, because a deleted environment cannot connect again. */
	async removeDeletedEnvironment(environmentId: string): Promise<void> {
		await this.purge(environmentId);
		this.publishToOtherMains([environmentId], 'deleted');
	}

	async resetCheckoutAfterDisconnect(environmentId: string): Promise<void> {
		await this.reset([environmentId]);
		this.publishToOtherMains([environmentId], 'disconnected');
	}

	async resetCheckoutAfterSettingsChange(environmentId: string): Promise<void> {
		await this.reset([environmentId]);
		this.publishToOtherMains([environmentId], 'settings-changed');
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
		await this.reset(environmentIds);
		this.publishToOtherMains(environmentIds, 'settings-changed');
	}

	/**
	 * Catches the folders that a failed removal or a lost message leaves behind.
	 * Lists the folders before it reads the database, so a folder that a new
	 * environment creates during the check is never removed. Every main runs it, so
	 * it does not publish.
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

	private async purge(environmentId: string) {
		try {
			await this.workingDirectory.purge(environmentId);
		} catch (error) {
			this.warn('Failed to remove the local promotion checkout', { environmentId }, error);
		}
	}

	private async reset(environmentIds: string[]) {
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
