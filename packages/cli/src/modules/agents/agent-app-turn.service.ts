import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal } from './agent-sandbox-principal';
import { emitChunkEvents } from './agent-sse-stream';
import { AgentRemoteTurnService } from './queue/agent-remote-turn.service';
import type { AgentAppChatRequest, AgentAppResumeRequest } from './queue/agent-turn-request.types';
import type { AgentExecutionStreamChunk } from './types/agent-steering';

/** `integrationType` and execution `source` of turns that an app starts. */
export const APP_AGENT_INTEGRATION_TYPE = 'app';

export const APP_VISITOR_ERROR_MESSAGE = 'The agent could not answer.';

type AppTurnRequest = AgentAppChatRequest | AgentAppResumeRequest;

/**
 * Runs the agent turns of app visitors. The apps module resolves the binding
 * and the visitor on the main, then this service runs the turn: on an agent
 * worker in agent queue mode, else in this process.
 *
 * Visitors only see the events that this service makes. It hides internal
 * errors and ends a finished turn with `done`, so the same rules apply on a
 * worker and on a main.
 */
@Service()
export class AgentAppTurnService {
	constructor(
		private readonly logger: Logger,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly remoteTurns: AgentRemoteTurnService,
	) {
		this.logger = this.logger.scoped('agents');
		for (const kind of ['app-chat', 'app-resume'] as const) {
			this.remoteTurns.handle(kind, {
				mode: 'stream',
				run: async (payload, { abortSignal, send }) => {
					for await (const event of this.runHere(payload, abortSignal)) send(event);
				},
				onError: (error, send) => send({ type: 'error', message: this.messageForVisitor(error) }),
			});
		}
	}

	/** The events of one turn. A visitor that leaves stops the turn. */
	async *events(request: AppTurnRequest, signal: AbortSignal): AsyncGenerator<AgentSseEvent> {
		if (!(await this.remoteTurns.canDispatch())) {
			const rejected: AgentSseEvent[] = [];
			if (this.remoteTurns.mayRunHere((event) => rejected.push(event))) {
				yield* this.runHere(request, signal);
			} else yield* rejected;
			return;
		}
		const relayed = new EventBuffer<AgentSseEvent>();
		// Settles without rejecting, so a failure while the relay runs is not an unhandled rejection.
		const remote = this.remoteTurns
			.stream(
				request,
				{ send: (event) => relayed.push(event), abortSignal: signal },
				{
					stopOnLeave: true,
				},
			)
			.then(
				(ranRemotely) => ({ ranRemotely, error: undefined }),
				(error: unknown) => ({ ranRemotely: true, error }),
			)
			.finally(() => relayed.end());
		yield* relayed;
		const { ranRemotely, error } = await remote;
		if (error !== undefined) {
			yield { type: 'error', message: this.messageForVisitor(error) };
			return;
		}
		if (!ranRemotely) yield* this.runHere(request, signal);
	}

	/** Runs the turn in this process. */
	async *runHere(request: AppTurnRequest, signal: AbortSignal): AsyncGenerator<AgentSseEvent> {
		const stream =
			request.kind === 'app-chat'
				? this.orchestrator.executeForChatPublished({
						agentId: request.agentId,
						projectId: request.projectId,
						message: request.message,
						memory: request.memory,
						integrationType: APP_AGENT_INTEGRATION_TYPE,
						allowBackgroundTasks: false,
						sandboxPrincipalHash: hashAgentSandboxPrincipal({
							type: 'project-session',
							projectId: request.projectId,
							sessionId: request.memory.threadId,
						}),
						abortSignal: signal,
					})
				: this.orchestrator.resumeForChat({
						agentId: request.agentId,
						projectId: request.projectId,
						runId: request.runId,
						toolCallId: request.toolCallId,
						resumeData: request.resumeData,
						usePublishedVersion: true,
						integrationType: APP_AGENT_INTEGRATION_TYPE,
						allowBackgroundTasks: false,
						expectedMemory: { threadId: request.threadId },
						source: APP_AGENT_INTEGRATION_TYPE,
						abortSignal: signal,
					});
		yield* this.toEvents(stream, request.sessionId);
	}

	private async *toEvents(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		sessionId: string,
	): AsyncGenerator<AgentSseEvent> {
		const pending: AgentSseEvent[] = [];
		const push = (event: AgentSseEvent) => pending.push(event);
		let suspended = false;
		try {
			for await (const chunk of stream) {
				emitChunkEvents(
					chunk.type === 'error'
						? { type: 'error', error: new Error(this.messageForVisitor(chunk.error)) }
						: chunk,
					push,
				);
				suspended ||= chunk.type === 'tool-call-suspended';
				yield* pending.splice(0);
			}
			if (!suspended) yield { type: 'done', sessionId };
		} catch (error) {
			yield { type: 'error', message: this.messageForVisitor(error) };
		}
	}

	private messageForVisitor(error: unknown): string {
		if (error instanceof UserError) return error.message;
		this.logger.error('App agent turn failed.', { error });
		return APP_VISITOR_ERROR_MESSAGE;
	}
}

/** Turns pushed values into an async iterable that ends after `end`. */
class EventBuffer<T> implements AsyncIterable<T> {
	private readonly values: T[] = [];

	private ended = false;

	private wake: (() => void) | undefined;

	push(value: T) {
		if (this.ended) return;
		this.values.push(value);
		this.notify();
	}

	end() {
		this.ended = true;
		this.notify();
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		while (true) {
			if (this.values.length > 0) {
				yield* this.values.splice(0);
				continue;
			}
			if (this.ended) return;
			await new Promise<void>((resolve) => {
				this.wake = resolve;
			});
		}
	}

	private notify() {
		const wake = this.wake;
		this.wake = undefined;
		wake?.();
	}
}
