import type { ExecutionLimitPeriodUnit, ExecutionLimitSettings } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { latestWins } from '@n8n/utils/promise/latest-wins';

import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import type { ApplicableLimits } from './execution-limits.types';
import { ProjectExecutionLimitRepository } from './project-execution-limit.repository';

export const REFRESH_INTERVAL_MS = 60 * Time.seconds.toMilliseconds;

/** Which scopes have a limit, so a reader of usage loads only those. */
export type LimitedScopes = {
	periodUnit: ExecutionLimitPeriodUnit;
	hasInstanceLimit: boolean;
	hasProjectLimits: boolean;
	/** Changes at each successful load. */
	generation: number;
};

/**
 * Every execution limit, held in memory so a read at an execution start does no I/O.
 * The database stays the source of truth.
 *
 * Kept fresh by events: the writing process reloads after its commit, and the others reload
 * on a pubsub command or when their pubsub connection comes back. A timer also reloads every
 * `REFRESH_INTERVAL_MS`, which recovers from a failed reload or a lost command.
 */
@Service()
export class ExecutionLimitsSnapshot {
	private loaded: {
		settings: ExecutionLimitSettings;
		projectMaxExecutions: ReadonlyMap<string, number>;
		generation: number;
	} | null = null;

	private refreshTimer: NodeJS.Timeout | undefined;

	constructor(
		private readonly settingsStore: ExecutionLimitSettingsStore,
		private readonly projectLimitRepository: ProjectExecutionLimitRepository,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	/** A failed first load does not stop the boot: the timer tries again. */
	async start(): Promise<void> {
		await this.reload();

		this.refreshTimer ??= setInterval(async () => await this.reload(), REFRESH_INTERVAL_MS);
		this.refreshTimer.unref();
	}

	@OnShutdown()
	stop(): void {
		clearInterval(this.refreshTimer);
		this.refreshTimer = undefined;
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

	/** `null` until the first load succeeds. */
	readLimitedScopes(): LimitedScopes | null {
		if (!this.loaded) return null;

		const { settings, projectMaxExecutions, generation } = this.loaded;
		return {
			periodUnit: settings.periodUnit,
			hasInstanceLimit: settings.instanceMaxExecutions !== null,
			hasProjectLimits: projectMaxExecutions.size > 0,
			generation,
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
			generation: (this.loaded?.generation ?? 0) + 1,
		};
	});
}
