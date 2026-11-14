import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

import { AgentExecutionService } from './agent-execution.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';

export const BACKGROUND_JOB_SHUTDOWN_ERROR =
	'Background job stopped before it finished, because the n8n process that ran it shut down.';

/**
 * Lets running agent turns and background sub-agents finish when the process
 * shuts down. Work that does not finish in time is marked interrupted or
 * failed, so that no row stays `running` until the sweeper finds it.
 */
@Service()
export class AgentShutdownDrain {
	/**
	 * Part of the graceful shutdown window that turns can use to finish. The
	 * rest is for the interrupted writes and the shutdown handlers that run after this one.
	 */
	static readonly DRAIN_BUDGET_RATIO = 0.7;

	static readonly POLL_INTERVAL_MS = 250;

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly executionService: AgentExecutionService,
		private readonly backgroundJobs: AgentBackgroundJobService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	private remaining() {
		return {
			turns: this.executionService.localExecutionIds().length,
			backgroundJobs: this.backgroundJobs.localRunCount,
		};
	}

	/** Runs before the default handlers, which close the channels and the registry entry that turns use. */
	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async drain(): Promise<void> {
		// New turns, also the child turns of new background jobs, now fail at once.
		this.executionService.beginShutdown();

		const budgetMs =
			this.globalConfig.generic.gracefulShutdownTimeout *
			Time.seconds.toMilliseconds *
			AgentShutdownDrain.DRAIN_BUDGET_RATIO;
		const deadline = Date.now() + budgetMs;

		let remaining = this.remaining();
		const busy = () => remaining.turns > 0 || remaining.backgroundJobs > 0;
		if (busy()) {
			this.logger.info('Waiting for running agent turns to finish before shutdown', {
				...remaining,
				budgetMs,
			});
		}
		while (busy() && Date.now() < deadline) {
			await sleep(Math.min(AgentShutdownDrain.POLL_INTERVAL_MS, deadline - Date.now()));
			remaining = this.remaining();
		}
		if (!busy()) return;

		// Settle the job rows first: the interrupted child turns would otherwise fail
		// them with a less clear error.
		const failedJobs =
			remaining.backgroundJobs > 0
				? await this.backgroundJobs.stopLocalRuns(BACKGROUND_JOB_SHUTDOWN_ERROR)
				: 0;
		const interrupted =
			remaining.turns > 0 ? await this.executionService.interruptLocalExecutions() : 0;
		this.logger.warn('Stopped agent work that did not finish before shutdown', {
			...remaining,
			interrupted,
			failedJobs,
		});
	}
}
