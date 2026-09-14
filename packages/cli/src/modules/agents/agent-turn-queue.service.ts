import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { type User, UserRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	AgentExecutionOrchestratorService,
	type ResumeForChatConfig,
} from './agent-execution-orchestrator.service';
import {
	AgentExecutionService,
	type ExecutionScope,
	type StartExecutionParams,
	type TurnRowValues,
} from './agent-execution.service';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type {
	AgentExecution,
	AgentTurnRunContext,
	QueuedChannelTurn,
} from './entities/agent-execution.entity';
import type { AgentChatBridge } from './integrations/agent-chat-bridge';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import {
	AgentExecutionRepository,
	AgentThreadClaimConflictError,
} from './repositories/agent-execution.repository';
import { AgentRepository } from './repositories/agent.repository';
import {
	draftChatMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';

/** Queued turns per thread. The running turn does not count. */
export const MAX_QUEUED_TURNS_PER_THREAD = 50;
export const AGENT_TURN_QUEUE_FULL_ERROR_CODE = 'agent_turn_queue_full';

export class AgentThreadQueueFullError extends UserError {
	readonly errorCode = AGENT_TURN_QUEUE_FULL_ERROR_CODE;

	constructor() {
		super(
			`This thread already has ${MAX_QUEUED_TURNS_PER_THREAD} messages waiting. Try again after the agent processes a message.`,
		);
	}
}

/**
 * The claimed running row of a turn. Whoever runs the turn records into this
 * row and calls `release()` once the row is finalized, also on error and abort.
 */
export interface AgentTurnClaim {
	executionId: string;
	threadId: string;
	/** Aborts when the run no longer holds its thread claim. */
	abortSignal: AbortSignal;
	/** Turn-end hook: runs the thread's queued rows, then requests the background wake. */
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
	TurnRowValues & { runContext: AgentTurnRunContext };

export type AgentTurnSubmitResult =
	| { status: 'claimed'; claim: AgentTurnClaim }
	| { status: 'queued'; executionId: string };

type QueuedRun = (claim: AgentTurnClaim) => Promise<void>;

/**
 * The one entry point for agent turns on the interactive surfaces. A turn is
 * an `agent_execution` row: `submit` inserts it as `queued` and promotes it to
 * the thread's claimed running row when the thread is free. The partial unique
 * index on `activeThreadId` is the only fence. A row that stays queued runs
 * headless once the running turn releases its claim, oldest first, on the main
 * that finalized that turn; the sweeper's `drainAll` covers a main that died.
 *
 * Invariant that keeps this poll-free: insert before claim, drain after finalize.
 */
@Service()
export class AgentTurnQueueService {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionService: AgentExecutionService,
		private readonly agentRepository: AgentRepository,
		private readonly userRepository: UserRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly orchestrator: AgentExecutionOrchestratorService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/**
	 * Store the turn and claim the thread for it when nothing is ahead of it.
	 * A message keeps arrival order behind queued rows and yields to a pending
	 * human response; a resume is that response and claims at once. Throws
	 * {@link AgentThreadQueueFullError} when the thread has its maximum of
	 * queued rows.
	 */
	async submit(turn: AgentTurnSubmission): Promise<AgentTurnSubmitResult> {
		const waiting = await this.executionRepository.countQueuedByThread(turn.threadId);
		if (waiting >= MAX_QUEUED_TURNS_PER_THREAD) throw new AgentThreadQueueFullError();
		const executionId = await this.executionService.recordQueuedExecution(
			await this.withAgentName(turn),
		);
		const claim = (await this.mustWait(turn, waiting))
			? null
			: await this.claimQueuedRow(scopeOf(turn, executionId));
		return claim ? { status: 'claimed', claim } : { status: 'queued', executionId };
	}

	/**
	 * Claim the thread for a turn that must not wait, or return null. Nothing is
	 * written while another run holds the thread, while queued rows wait, or
	 * while a message would cut in front of a pending human response. A `wake`
	 * run does not request another wake when it ends.
	 */
	async tryRunNow(
		turn: AgentTurnSubmission,
		{ wake = false }: { wake?: boolean } = {},
	): Promise<AgentTurnClaim | null> {
		const waiting = await this.executionRepository.countQueuedByThread(turn.threadId);
		if (await this.mustWait(turn, waiting)) return null;
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

	/** Run queued rows in the background. Concurrent drains are fenced by queued-row promotion. */
	requestDrain(threadId: string): void {
		void this.drain(threadId).catch((error: unknown) => {
			this.logger.warn('Failed to run queued agent turns', { threadId, error });
		});
	}

	/** Restart the drains of every thread with queued rows, e.g. after a main died mid-turn. */
	async drainAll(): Promise<void> {
		for (const threadId of await this.executionRepository.findThreadIdsWithQueued()) {
			this.requestDrain(threadId);
		}
	}

	private async drain(threadId: string): Promise<void> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		if (!thread) return;
		for (;;) {
			// A resume is the human response the message rows wait for, so it goes first.
			const rows = await this.executionRepository.findQueuedByThread(threadId);
			const row = rows.find((candidate) => candidate.runContext?.kind === 'resume') ?? rows[0];
			if (!row) return;
			if ((await this.runQueuedRow(row, thread)) === 'deferred') return;
		}
	}

	/**
	 * `deferred` stops the drain: another run holds the thread, the thread awaits
	 * a human response, or this main cannot reply on the row's channel. A row
	 * that can never run ends as an error execution and the drain moves on.
	 */
	private async runQueuedRow(
		row: AgentExecution,
		thread: AgentExecutionThread,
	): Promise<'ran' | 'skipped' | 'deferred'> {
		const scope: ExecutionScope = {
			executionId: row.id,
			threadId: row.threadId,
			agentId: thread.agentId,
			projectId: thread.projectId,
		};
		let run: QueuedRun;
		try {
			const prepared = await this.prepareQueuedRun(row, thread);
			if (prepared === 'deferred') return 'deferred';
			run = prepared;
		} catch (error) {
			await this.executionService.failQueuedExecution(scope, errorMessage(error));
			return 'skipped';
		}

		// No claim: another run holds the thread, or this row's own submit just took
		// it. Either run releases into a new drain, so this one stops.
		const claim = await this.claimQueuedRow(scope);
		if (!claim) return 'deferred';

		try {
			await run(claim);
		} catch (error) {
			await claim.fail(error);
			this.logger.debug('Queued agent turn failed', { executionId: row.id, error });
		}
		return 'ran';
	}

	private async prepareQueuedRun(
		row: AgentExecution,
		thread: AgentExecutionThread,
	): Promise<QueuedRun | 'deferred'> {
		const context = row.runContext;
		if (!context) throw new UnexpectedError('Queued agent turn has no run context');
		if (context.kind === 'message' && (await this.awaitsHumanResponse(thread.agentId, row))) {
			return 'deferred';
		}

		if (context.channel) {
			const bridge = await this.getBridge(thread.agentId, context.channel);
			if (!bridge) {
				this.logger.debug('Queued channel turn waits for its chat connection', {
					executionId: row.id,
					integrationType: context.channel.integrationType,
				});
				return 'deferred';
			}
			return context.kind === 'message'
				? async (claim) => await bridge.runQueuedMessage(row, claim)
				: async (claim) => await bridge.runQueuedResume(row, claim);
		}

		const user = await this.resolveSender(row.resourceId, thread.projectId);
		const memory = { threadId: row.threadId, resourceId: draftChatMemoryResourceId(user.id) };
		if (context.kind === 'resume') {
			const config: ResumeForChatConfig = {
				agentId: thread.agentId,
				projectId: thread.projectId,
				runId: context.runId,
				toolCallId: context.toolCallId,
				resumeData: context.resumeData,
				user,
				usePublishedVersion: false,
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				expectedMemory: memory,
				source: row.source ?? undefined,
				previewChat: true,
			};
			// A resume whose checkpoint moved on can never run; failing it here ends the row.
			await this.orchestrator.resolveResumeThread(config);
			return async (claim) => await consumeStream(this.orchestrator.resumeForChat(config, claim));
		}
		return async (claim) =>
			await consumeStream(
				this.orchestrator.executeForChat(
					{
						agentId: thread.agentId,
						projectId: thread.projectId,
						message: row.userMessage ?? '',
						user,
						memory,
						attachments: row.attachments ?? undefined,
						source: row.source ?? undefined,
						previewChat: true,
					},
					claim,
				),
			);
	}

	/**
	 * Promote the queued row to the thread's running row. Null when the row is
	 * no longer queued or when another run holds the thread; the row then waits.
	 */
	private async claimQueuedRow(scope: ExecutionScope): Promise<AgentTurnClaim | null> {
		try {
			const claimed = await this.executionService.claimQueuedExecution(
				scope.executionId,
				scope.threadId,
				new Date(),
			);
			return claimed ? this.toClaim(scope, claimed.claimLost, false) : null;
		} catch (error) {
			if (error instanceof AgentThreadClaimConflictError) return null;
			throw error;
		}
	}

	private toClaim(scope: ExecutionScope, claimLost: AbortSignal, wake: boolean): AgentTurnClaim {
		const release = async () => {
			this.requestDrain(scope.threadId);
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
	 * A message keeps arrival order behind queued rows and yields to the
	 * thread's pending human response; a resume is that response.
	 */
	private async mustWait(turn: AgentTurnSubmission, waiting: number): Promise<boolean> {
		if (turn.runContext.kind === 'resume') return false;
		return waiting > 0 || (await this.awaitsHumanResponse(turn.agentId, turn));
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

	/** The sender must still be able to run the agent; the drain has no request that checked that. */
	private async resolveSender(resourceId: string | null, projectId: string): Promise<User> {
		const userId = resourceId ? userIdFromDraftChatMemoryResourceId(resourceId) : undefined;
		const user = userId ? await this.userRepository.findByIdWithRole(userId) : null;
		if (!user || user.disabled) {
			throw new OperationalError('The user who sent this message is no longer active');
		}
		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
			throw new OperationalError('The user who sent this message can no longer run this agent');
		}
		return user;
	}

	/** Lazy: the chat integration service depends on the orchestrator, which this service wraps. */
	private async getBridge(
		agentId: string,
		channel: QueuedChannelTurn,
	): Promise<AgentChatBridge | undefined> {
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service.js');
		return Container.get(ChatIntegrationService).getBridge(
			agentId,
			channel.integrationType,
			channel.credentialId,
		);
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

/** Drive a turn with no live consumer to its end; the orchestrator records the outcome on the row. */
export async function consumeStream(stream: AsyncIterable<unknown>): Promise<void> {
	for await (const _chunk of stream) {
		// Each chunk is recorded by the orchestrator; open chats re-read the row on the push.
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
