import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import {
	AgentExecutionService,
	type ExecutionScope,
	type StartExecutionParams,
	type TurnRowValues,
} from './agent-execution.service';
import type { AgentExecution } from './entities/agent-execution.entity';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentThreadClaimConflictError } from './repositories/agent-execution.repository';
import { AgentRepository } from './repositories/agent.repository';

/**
 * The claimed running row of a turn. Whoever runs the turn records into this
 * row and calls `release()` once the row is finalized, also on error and abort.
 */
export interface AgentTurnClaim {
	executionId: string;
	threadId: string;
	/** Aborts when the run no longer holds its thread claim. */
	abortSignal: AbortSignal;
	/** Turn-end hook: requests the thread's pending background wake. */
	release(): Promise<void>;
	/**
	 * End a turn that failed before the orchestrator took the row over: the row
	 * becomes an error execution and the claim is released. A no-op once the
	 * orchestrator finalized the row itself.
	 */
	fail(error: unknown): Promise<void>;
}

/** A turn as its row stores it before it runs. Telemetry joins at finalize, the agent name at insert. */
export type AgentTurnSubmission = Omit<StartExecutionParams, 'telemetry' | 'agentName'> &
	TurnRowValues;

export class AgentThreadBusyError extends UserError {
	constructor() {
		super(
			'The agent is still working on an earlier message in this session. Try again once it has answered.',
		);
	}
}

/**
 * Claims top-level agent turns against durable execution rows. The partial
 * unique index on running rows with a `runContext` is the only thread fence.
 */
@Service()
export class AgentTurnQueueService {
	constructor(
		private readonly logger: Logger,
		private readonly executionService: AgentExecutionService,
		private readonly agentRepository: AgentRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/**
	 * Claim the thread for a turn that must not wait, or return null. Nothing
	 * is written while another run holds the thread or while a message would
	 * cut in front of a pending human response. A `wake` run does not request
	 * another wake when it ends.
	 */
	async tryRunNow(
		turn: AgentTurnSubmission,
		{ wake = false }: { wake?: boolean } = {},
	): Promise<AgentTurnClaim | null> {
		if (
			turn.runContext.kind === 'message' &&
			(await this.awaitsHumanResponse(turn.agentId, turn))
		) {
			return null;
		}
		try {
			const { executionId, claimLost } = await this.executionService.startClaimedExecutionRecording(
				await this.withAgentName(turn),
				new Date(),
			);
			return this.toClaim(scopeOf(turn, executionId), claimLost, wake);
		} catch (error) {
			if (error instanceof AgentThreadClaimConflictError) return null;
			throw error;
		}
	}

	private toClaim(scope: ExecutionScope, claimLost: AbortSignal, wake: boolean): AgentTurnClaim {
		const release = async () => {
			if (!wake) await this.requestWake(scope.threadId);
		};
		return {
			executionId: scope.executionId,
			threadId: scope.threadId,
			abortSignal: claimLost,
			release,
			fail: async (error) => {
				// The orchestrator records its own failures on the row; this only ends a
				// turn that failed before it started, so the claim cannot leak.
				if (await this.executionService.failClaimedExecution(scope, errorMessage(error))) {
					await release();
				}
			},
		};
	}

	/**
	 * Execution rows keep `suspended` after a resume, so the checkpoint store
	 * decides; the row count is the cheap negative filter in front of it.
	 */
	private async awaitsHumanResponse(
		agentId: string,
		{ threadId }: Pick<AgentExecution, 'threadId'>,
	): Promise<boolean> {
		return (
			(await this.executionService.hasSuspendedRun(threadId)) &&
			(await this.checkpointStorage.findSuspendedForThread(agentId, threadId)) !== null
		);
	}

	private async withAgentName(
		turn: AgentTurnSubmission,
	): Promise<StartExecutionParams & TurnRowValues> {
		const [agent] = await this.agentRepository.findSummariesByIds([turn.agentId]);
		if (!agent || agent.projectId !== turn.projectId) {
			throw new UserError(`Agent "${turn.agentId}" not found`);
		}
		return { ...turn, agentName: agent.name };
	}

	private async requestWake(threadId: string): Promise<void> {
		try {
			const { AgentWakeService } = await import('./background/agent-wake.service.js');
			await Container.get(AgentWakeService).onParentTurnFinished(threadId);
		} catch (error) {
			this.logger.warn('Failed to request pending background job delivery', { threadId, error });
		}
	}
}

function scopeOf(
	{ threadId, agentId, projectId }: Pick<ExecutionScope, 'threadId' | 'agentId' | 'projectId'>,
	executionId: string,
): ExecutionScope {
	return { executionId, threadId, agentId, projectId };
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
