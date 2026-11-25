import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { SystemAgentRegistry } from './system-agent-registry';
import type {
	SystemAgentDelegatedRunUsageReport,
	SystemAgentDelegatedSideCallUsageReport,
	SystemAgentProvider,
} from './system-agent.types';

/**
 * Routes the usage of a delegated run to the system agent of the turn that
 * delegated it. The route comes from the database (parent execution, then
 * its thread, then the agent of that thread), not from a callback in the
 * runtime. So it also works for background runs, after a restart and on
 * another main, and a cached runtime cannot report to an earlier turn.
 */
@Service()
export class SystemAgentUsageRelay {
	constructor(
		private readonly logger: Logger,
		private readonly registry: SystemAgentRegistry,
		private readonly executionRepository: AgentExecutionRepository,
	) {}

	/** Report the usage in the background. A failure only logs a warning. */
	reportDelegatedRun(report: SystemAgentDelegatedRunUsageReport): void {
		void this.relay(report);
	}

	/** Report the side-call usage in the background. A failure only logs a warning. */
	reportDelegatedSideCall(report: SystemAgentDelegatedSideCallUsageReport): void {
		void this.relaySideCall(report);
	}

	/** Exposed for tests, so they can wait for the report. Never rejects. */
	async relay(report: SystemAgentDelegatedRunUsageReport): Promise<void> {
		await this.deliver(report, 'Failed to report delegated run usage', async (provider, thread) => {
			await provider.onDelegatedRunUsage?.(report, { thread });
		});
	}

	/** Exposed for tests, so they can wait for the report. Never rejects. */
	async relaySideCall(report: SystemAgentDelegatedSideCallUsageReport): Promise<void> {
		await this.deliver(
			report,
			'Failed to report delegated side-call usage',
			async (provider, thread) => {
				await provider.onDelegatedSideCallUsage?.(report, { thread });
			},
		);
	}

	private async deliver(
		report: { executionId: string; parentExecutionId: string },
		failureMessage: string,
		send: (provider: SystemAgentProvider, thread: AgentExecutionThread) => Promise<void>,
	): Promise<void> {
		try {
			const thread = await this.executionRepository.findThreadOf(report.parentExecutionId);
			if (!thread) return;
			// Project agents have no provider, so their delegated runs are not reported.
			const provider = this.registry.get(thread.agentId);
			if (!provider) return;
			await send(provider, thread);
		} catch (error) {
			this.logger.warn(failureMessage, {
				executionId: report.executionId,
				parentExecutionId: report.parentExecutionId,
				error,
			});
		}
	}
}
