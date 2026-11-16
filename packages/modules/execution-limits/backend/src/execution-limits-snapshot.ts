import type { ExecutionLimitSettings } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { latestWins } from '@n8n/utils/promise/latest-wins';

import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import type { ApplicableLimits } from './execution-limits.types';
import { ProjectExecutionLimitRepository } from './project-execution-limit.repository';

/**
 * Every execution limit, held in memory so a read at an execution start does no I/O.
 * The database stays the source of truth.
 *
 * Kept fresh by events only: the writing process reloads after its commit, and the others
 * reload on a pubsub command or when their pubsub connection comes back. A command that is
 * lost while the connection stays up leaves a process on the old limits until the next change.
 */
@Service()
export class ExecutionLimitsSnapshot {
	private loaded: {
		settings: ExecutionLimitSettings;
		projectMaxExecutions: ReadonlyMap<string, number>;
	} | null = null;

	constructor(
		private readonly settingsStore: ExecutionLimitSettingsStore,
		private readonly projectLimitRepository: ProjectExecutionLimitRepository,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	/** `null` until the first load succeeds. */
	read(projectId: string): ApplicableLimits | null {
		if (!this.loaded) return null;

		return {
			periodUnit: this.loaded.settings.periodUnit,
			instanceMaxExecutions: this.loaded.settings.instanceMaxExecutions,
			projectMaxExecutions: this.loaded.projectMaxExecutions.get(projectId) ?? null,
		};
	}

	/** A failed reload keeps the limits that are loaded, and the next reload tries again. */
	@OnPubSubEvent('reload-execution-limits')
	@OnPubSubEvent('pubsub-reconnected')
	async reload(): Promise<void> {
		try {
			await this.loadLatest();
		} catch (error) {
			this.logger.error('Failed to load execution limits', { error });
		}
	}

	/** Call after a limit write commits, never inside its transaction. */
	async refreshAfterWrite(): Promise<void> {
		await this.reload();

		// Not awaited: a disconnected Redis queues the publish, and the write already committed.
		void this.publisher
			.publishCommand({ command: 'reload-execution-limits' })
			.catch((error: unknown) => {
				this.logger.warn('Failed to tell other processes to reload execution limits', { error });
			});
	}

	private readonly loadLatest = latestWins(async () => {
		const [settings, projectLimits] = await Promise.all([
			this.settingsStore.read({}),
			this.projectLimitRepository.findAll({}),
		]);

		this.loaded = {
			settings,
			projectMaxExecutions: new Map(
				projectLimits.map(({ projectId, maxExecutions }) => [projectId, maxExecutions]),
			),
		};
	});
}
