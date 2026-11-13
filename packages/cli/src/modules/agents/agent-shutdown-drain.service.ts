import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

import { AgentExecutionService } from './agent-execution.service';

/**
 * Lets running agent turns finish when the process shuts down. Turns that
 * do not finish in time are marked interrupted, so that no row stays
 * `running` until the sweeper finds it.
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
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Runs before the default handlers, which close the channels and the registry entry that turns use. */
	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async drain(): Promise<void> {
		this.executionService.beginShutdown();

		const budgetMs =
			this.globalConfig.generic.gracefulShutdownTimeout *
			Time.seconds.toMilliseconds *
			AgentShutdownDrain.DRAIN_BUDGET_RATIO;
		const deadline = Date.now() + budgetMs;

		let remaining = this.executionService.localExecutionIds().length;
		if (remaining > 0) {
			this.logger.info('Waiting for running agent turns to finish before shutdown', {
				count: remaining,
				budgetMs,
			});
		}
		while (remaining > 0 && Date.now() < deadline) {
			await sleep(Math.min(AgentShutdownDrain.POLL_INTERVAL_MS, deadline - Date.now()));
			remaining = this.executionService.localExecutionIds().length;
		}
		if (remaining === 0) return;

		const interrupted = await this.executionService.interruptLocalExecutions();
		this.logger.warn('Marked agent turns that did not finish before shutdown as interrupted', {
			remaining,
			interrupted,
		});
	}
}
