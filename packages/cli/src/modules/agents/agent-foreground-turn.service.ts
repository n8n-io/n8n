import { LockAcquisitionTimeoutError, LockNamespace, LockService } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

export class AgentSessionBusyError extends OperationalError {
	constructor(readonly threadId: string) {
		super('The agent is working in this session.');
	}
}

@Service()
export class AgentForegroundTurnService {
	constructor(
		private readonly lockService: LockService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
	) {}

	async run<T>(
		threadId: string,
		action: (signal: AbortSignal) => Promise<T>,
		options: { waitForLease?: boolean } = {},
	): Promise<T> {
		try {
			return await this.lockService.withLease(
				LockNamespace.KNOWN_LOCKS,
				`agent-foreground-turn:${threadId}`,
				async (signal) => {
					signal.throwIfAborted();
					// Keep the database guard for runs on an older main or a lost lease.
					if (await this.executionRepository.existsRunningByThread(threadId)) {
						throw new AgentSessionBusyError(threadId);
					}
					signal.throwIfAborted();
					return await action(signal);
				},
				{ waitTimeoutMs: options.waitForLease ? undefined : 0, leaseTtlMs: 30_000 },
			);
		} catch (error) {
			if (error instanceof LockAcquisitionTimeoutError) throw new AgentSessionBusyError(threadId);
			throw error;
		}
	}

	async runForChat<T>(
		agentId: string,
		threadId: string,
		action: (signal: AbortSignal) => Promise<T>,
	): Promise<T> {
		return await this.run(threadId, async (signal) => {
			if (await this.checkpointStorage.findSuspendedForThread(agentId, threadId)) {
				throw new AgentSessionBusyError(threadId);
			}
			return await action(signal);
		});
	}

	async runForResume<T>(
		agentId: string,
		runId: string,
		action: (signal: AbortSignal) => Promise<T>,
		options: { waitForLease?: boolean } = {},
	): Promise<T> {
		const status = await this.checkpointStorage.getStatus(runId, agentId);
		if (status.status !== 'active') throw new UserError('This agent run cannot be resumed.');
		const threadId = status.checkpoint.persistence?.threadId;
		if (!threadId) throw new UserError('This agent run cannot be resumed.');
		return await this.run(threadId, action, options);
	}
}
