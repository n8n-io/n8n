import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { SystemAgentRegistry } from './system-agent-registry';
import type { SystemAgentDelegatedRunUsageReport } from './system-agent.types';

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
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {}

	/** Report the usage in the background. A failure only logs a warning. */
	reportDelegatedRun(report: SystemAgentDelegatedRunUsageReport): void {
		void this.relay(report);
	}

	/** Exposed for tests, so they can wait for the report. Never rejects. */
	async relay(report: SystemAgentDelegatedRunUsageReport): Promise<void> {
		try {
			const parentThreadId = await this.executionRepository.findThreadIdOf(
				report.parentExecutionId,
			);
			if (parentThreadId === null) return;
			const thread = await this.threadRepository.findOneBy({ id: parentThreadId });
			if (!thread) return;
			// Project agents have no provider, so their delegated runs are not reported.
			const provider = this.registry.get(thread.agentId);
			if (!provider?.onDelegatedRunUsage) return;
			await provider.onDelegatedRunUsage(report, { thread });
		} catch (error) {
			this.logger.warn('Failed to report delegated run usage', {
				executionId: report.executionId,
				parentExecutionId: report.parentExecutionId,
				error,
			});
		}
	}
}
