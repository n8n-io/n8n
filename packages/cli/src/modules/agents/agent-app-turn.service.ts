import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';

import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal } from './agent-sandbox-principal';
import { emitChunkEvents } from './agent-sse-stream';
import { AgentTurnDispatcher } from './queue/agent-turn-dispatcher.service';
import { AgentTurnHandlers } from './queue/agent-turn-handlers.service';
import type { AgentAppChatRequest, AgentAppResumeRequest } from './queue/agent-turn-request.types';
import type { AgentExecutionStreamChunk } from './types/agent-steering';

/** `integrationType` and execution `source` of turns that an app starts. */
export const APP_AGENT_INTEGRATION_TYPE = 'app';

export const APP_VISITOR_ERROR_MESSAGE = 'The agent could not answer.';

export const APP_VISITOR_TOO_SLOW_MESSAGE =
	'The connection was too slow to receive the answer. Try again.';

/**
 * Events that wait for a slow visitor. Over this, n8n stops the turn, so that
 * a visitor that stops to read cannot fill the memory of the process.
 */
export const APP_MAX_BUFFERED_EVENTS = 5_000;

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
		private readonly dispatcher: AgentTurnDispatcher,
		handlers: AgentTurnHandlers,
	) {
		this.logger = this.logger.scoped('agents');
		for (const kind of ['app-chat', 'app-resume'] as const) {
			handlers.handle(kind, {
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
		const overflow = new AbortController();
		const relayed = new EventBuffer<AgentSseEvent>(APP_MAX_BUFFERED_EVENTS, () => overflow.abort());
		// Settles without rejecting, so a failure while the turn runs is not an unhandled rejection.
		const turn = this.dispatcher
			.stream(
				request,
				{
					send: (event) => relayed.push(event),
					abortSignal: AbortSignal.any([signal, overflow.signal]),
				},
				{ stopOnLeave: true },
			)
			.then(
				() => undefined,
				(error: unknown) => error ?? new Error('The agent turn failed'),
			)
			.finally(() => relayed.end());
		yield* relayed;
		const error = await turn;
		if (overflow.signal.aborted) {
			this.logger.warn('Stopped an app turn, because the visitor read its events too slowly');
			yield { type: 'error', message: APP_VISITOR_TOO_SLOW_MESSAGE };
			return;
		}
		if (error !== undefined) yield { type: 'error', message: this.messageForVisitor(error) };
	}

	/** Runs the turn in this process. The handler of `app-chat` and `app-resume` turns. */
	private async *runHere(
		request: AppTurnRequest,
		signal: AbortSignal,
	): AsyncGenerator<AgentSseEvent> {
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

/**
 * Turns pushed values into an async iterable that ends after `end`. When more
 * than `maxValues` values wait for the reader, the buffer ends and calls
 * `onOverflow`. The reader still gets the values that wait.
 */
export class EventBuffer<T> implements AsyncIterable<T> {
	private readonly values: T[] = [];

	private ended = false;

	private wake: (() => void) | undefined;

	constructor(
		private readonly maxValues: number,
		private readonly onOverflow: () => void,
	) {}

	push(value: T) {
		if (this.ended) return;
		if (this.values.length >= this.maxValues) {
			this.end();
			this.onOverflow();
			return;
		}
		this.values.push(value);
		this.notify();
	}

	end() {
		this.ended = true;
		this.notify();
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		while (true) {
			// One at a time, so that `values` holds every value that the reader did not take.
			const [next] = this.values.splice(0, 1);
			if (next !== undefined) {
				yield next;
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
