import { N8N_CHAT_INTEGRATION_TYPE, type AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { AgentClusterService } from './agent-cluster.service';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentQueuedTestStreamService } from './agent-queued-test-stream.service';
import {
	emitChunkEvents,
	type FlushableResponse,
	initSseStream,
	toChatErrorEvent,
} from './agent-sse-stream';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentTurnPlacement } from './queue/agent-turn-placement.service';
import { AgentTurnQueue } from './queue/agent-turn-queue.service';
import type { AgentChatResumeRequest } from './queue/agent-turn-request.types';
import { AgentTurnRequestRepository } from './repositories/agent-turn-request.repository';
import type { AgentExecutionStreamChunk } from './types/agent-steering';
import { productionChatMemoryResourceId } from './utils/agent-memory-scope';

/** Where a resumed turn sends its events. */
export interface AgentResumeStream {
	send: (event: AgentSseEvent) => void;
	onChunk: (chunk: AgentExecutionStreamChunk) => void;
	onExecutionStarted: (executionId: string, sessionId: string, inputMessageIds: string[]) => void;
}

/** The stream key of a resume that runs on another process. */
export const resumeStreamKey = (requestId: string) => `resume:${requestId}`;

/**
 * Runs the answer to a suspended tool call in the chat of an agent.
 *
 * In agent queue mode, a main stores the answer in an `agent_turn_request`
 * row and sends a request job to the agent workers. The worker that claims
 * the row runs the resumed turn and relays its events to the main that holds
 * the browser stream. When no worker claims the row in time, the main claims
 * it and runs the turn itself. Each row is claimed once, so a resume runs at
 * most once.
 */
@Service()
export class AgentChatResumeService {
	/** How often the main checks a remote resume while it waits. */
	static readonly POLL_INTERVAL_MS = 1_000;

	/** A worker that sends nothing for this long is treated as lost. */
	static readonly RELAY_TIMEOUT_MS = 30_000;

	/** Requests older than this are left over from a crash. */
	static readonly STALE_REQUEST_MS = 60 * 60 * 1_000;

	constructor(
		private readonly logger: Logger,
		private readonly cluster: AgentClusterService,
		private readonly placement: AgentTurnPlacement,
		private readonly turnQueue: AgentTurnQueue,
		private readonly requests: AgentTurnRequestRepository,
		private readonly streams: AgentQueuedTestStreamService,
		private readonly userRepository: UserRepository,
		private readonly testRuns: AgentTestRunService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Stream a resume to the browser. A worker runs it when agent queue mode is on. */
	async relay(res: FlushableResponse, request: AgentChatResumeRequest, user: User): Promise<void> {
		const delivery = initSseStream(res);
		const stream: AgentResumeStream = {
			send: delivery.send,
			onChunk: delivery.onChunk,
			onExecutionStarted: (executionId, sessionId, inputMessageIds) => {
				delivery.send({ type: 'execution-started', executionId, sessionId, inputMessageIds });
			},
		};
		try {
			const ranRemotely = await this.tryRunOnWorker(request, delivery);
			if (!ranRemotely) await this.run(request, user, stream);
		} catch (error) {
			delivery.send(toChatErrorEvent(error, 'Resume failed'));
		} finally {
			delivery.close();
		}
	}

	/** Run a resume request job on this worker. */
	async runRequest(requestId: string): Promise<void> {
		const claimant = this.cluster.instanceKey;
		if (!claimant) return;
		const request = await this.requests.claim(requestId, claimant);
		if (request?.kind !== 'chat-resume') return;

		const sender = this.streams.createSender(resumeStreamKey(requestId));
		const stream: AgentResumeStream = {
			send: sender.send,
			onChunk: (chunk) => emitChunkEvents(chunk, sender.send),
			onExecutionStarted: (executionId, sessionId, inputMessageIds) => {
				sender.send({ type: 'execution-started', executionId, sessionId, inputMessageIds });
			},
		};
		try {
			const user = await this.userRepository.findByIdWithRole(request.userId);
			if (!user || user.disabled) throw new UserError('You can no longer execute this agent');
			await this.run(request, user, stream);
		} catch (error) {
			sender.send(toChatErrorEvent(error, 'Resume failed'));
		} finally {
			await sender.close();
			await this.requests.remove(requestId).catch(() => {});
		}
	}

	/** Run the resumed turn in this process. */
	async run(request: AgentChatResumeRequest, user: User, stream: AgentResumeStream): Promise<void> {
		if (request.surface === 'preview') {
			const result = await this.testRuns.resumePreparedDraftRun({
				agentId: request.agentId,
				projectId: request.projectId,
				runId: request.runId,
				toolCallId: request.toolCallId,
				resumeData: request.resumeData,
				user,
				chatSurface: 'preview',
				errorMode: 'forward',
				onChunk: stream.onChunk,
				onBudgetNotice: (notice) => stream.send({ type: 'budget-notice', ...notice }),
				onExecutionStarted: stream.onExecutionStarted,
			});
			if (result.status === 'completed') {
				stream.send({
					type: 'done',
					...(result.executionId ? { executionId: result.executionId } : {}),
				});
			}
			return;
		}

		let executionId: string | undefined;
		const chunks = this.orchestrator.resumeForChat({
			agentId: request.agentId,
			projectId: request.projectId,
			runId: request.runId,
			toolCallId: request.toolCallId,
			resumeData: request.resumeData,
			user,
			usePublishedVersion: true,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			chatSurface: 'n8n-chat',
			expectedMemory: { resourceId: productionChatMemoryResourceId(user.id) },
			onExecutionStarted: stream.onExecutionStarted,
			onExecutionRecorded: (id) => {
				executionId = id;
			},
		});
		let suspended = false;
		let failed = false;
		for await (const chunk of chunks) {
			stream.onChunk(chunk);
			if (chunk.type === 'tool-call-suspended') suspended = true;
			if (chunk.type === 'error') failed = true;
		}
		if (!suspended && !failed) {
			stream.send({ type: 'done', ...(executionId ? { executionId } : {}) });
		}
	}

	/**
	 * Send the resume to a worker and relay its events. Returns `false` when
	 * this main must run the resume itself: no worker is up, the job could not
	 * be sent, or no worker claimed the request in time.
	 */
	private async tryRunOnWorker(
		request: AgentChatResumeRequest,
		delivery: ReturnType<typeof initSseStream>,
	): Promise<boolean> {
		if (!(await this.placement.workersAvailable())) return false;

		this.removeStaleRequests();
		const requestId = randomUUID();
		await this.requests.createPending(requestId, request);

		let finished = false;
		// The browser stream stays open after a remote end, so that this main can
		// still report a lost worker. `relay` closes it.
		const subscription = this.streams.subscribe(resumeStreamKey(requestId), {
			...delivery,
			close: () => {
				finished = true;
			},
		});
		try {
			try {
				await this.turnQueue.enqueueRequest(requestId);
			} catch (error) {
				this.logger.warn('Failed to send an agent resume to a worker', { requestId, error });
				return !(await this.claimHere(requestId));
			}

			const sentAt = Date.now();
			let claimedSeenAt: number | undefined;
			while (!finished) {
				await sleep(AgentChatResumeService.POLL_INTERVAL_MS);
				if (finished || delivery.abortSignal.aborted) break;
				if (claimedSeenAt === undefined) {
					if (await this.requests.isPending(requestId)) {
						if (Date.now() - sentAt < AgentTurnPlacement.FALLBACK_WAIT_MS) continue;
						if (await this.claimHere(requestId)) return false;
					}
					claimedSeenAt = Date.now();
					continue;
				}
				const lastSign = Math.max(subscription.lastEventAt(), claimedSeenAt);
				if (Date.now() - lastSign >= AgentChatResumeService.RELAY_TIMEOUT_MS) {
					this.logger.warn('Lost the worker that runs an agent resume', { requestId });
					delivery.send({
						type: 'error',
						message: 'The agent stopped responding. Reload the chat to see its latest state.',
					});
					break;
				}
			}
			return true;
		} finally {
			subscription.close();
			await this.requests.remove(requestId).catch(() => {});
		}
	}

	private async claimHere(requestId: string): Promise<boolean> {
		const claimant = this.cluster.instanceKey ?? `main:${randomUUID()}`;
		return (await this.requests.claim(requestId, claimant)) !== null;
	}

	private removeStaleRequests(): void {
		const cutoff = new Date(Date.now() - AgentChatResumeService.STALE_REQUEST_MS);
		this.requests.removeOlderThan(cutoff).catch((error: unknown) => {
			this.logger.debug('Failed to remove stale agent turn requests', { error });
		});
	}
}
