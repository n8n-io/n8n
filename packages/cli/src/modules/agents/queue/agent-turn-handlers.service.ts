import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JsonObject } from 'n8n-workflow';

import type { AgentTurnRequestPayload } from './agent-turn-request.types';
import type { AgentTurnEnd } from './agent-turn-runner';

type Kind = AgentTurnRequestPayload['kind'];
type PayloadOf<K extends Kind> = Extract<AgentTurnRequestPayload, { kind: K }>;

/** What a handler gets when it runs a turn. */
export interface AgentTurnContext {
	turnId: string;
	/** Aborts when the turn is cancelled, for example because its caller left. */
	abortSignal: AbortSignal;
}

/** A turn that streams events to the caller, such as a chat resume. */
export interface AgentStreamTurnHandler<K extends Kind> {
	mode: 'stream';
	run: (
		payload: PayloadOf<K>,
		context: AgentTurnContext & { send: (event: AgentSseEvent) => void },
	) => Promise<void>;
	/** Sends the error of a turn that failed before it could report it. */
	onError: (error: unknown, send: (event: AgentSseEvent) => void) => void;
}

/** A turn whose caller waits for one reply, such as a webhook call. */
export interface AgentResultTurnHandler<K extends Kind> {
	mode: 'result';
	run: (payload: PayloadOf<K>, context: AgentTurnContext) => Promise<JsonObject>;
}

/** A turn that no caller waits for, such as the resume of a workflow tool. */
export interface AgentDetachedTurnHandler<K extends Kind> {
	mode: 'detached';
	run: (payload: PayloadOf<K>, context: AgentTurnContext) => Promise<void>;
}

export type AgentTurnHandler<K extends Kind> =
	| AgentStreamTurnHandler<K>
	| AgentResultTurnHandler<K>
	| AgentDetachedTurnHandler<K>;

/**
 * Knows how to run each kind of agent turn. The services that own a kind
 * register its handler. Every runner reads the handlers from here, so a turn
 * runs the same way in a main and on an agent worker.
 */
@Service()
export class AgentTurnHandlers {
	private readonly handlers = new Map<Kind, AgentTurnHandler<Kind>>();

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('agents');
	}

	/** Register how this process runs one kind of turn. */
	handle<K extends Kind>(kind: K, handler: AgentTurnHandler<K>): void {
		// Each handler only receives the payload of its own kind, see `run`.
		this.handlers.set(kind, handler);
	}

	/** How a kind of turn reports to its caller, or `undefined` when this process cannot run it. */
	modeOf(kind: Kind): AgentTurnHandler<Kind>['mode'] | undefined {
		return this.handlers.get(kind)?.mode;
	}

	/**
	 * Run a turn in this process and tell how it ended. Never throws: a turn
	 * that throws ends as `failed`. A stream turn sends its error event first.
	 */
	async run(
		payload: AgentTurnRequestPayload,
		context: AgentTurnContext,
		send: (event: AgentSseEvent) => void,
	): Promise<AgentTurnEnd> {
		const handler = this.handlers.get(payload.kind);
		if (!handler) {
			this.logger.warn('No handler for an agent turn on this process', {
				turnId: context.turnId,
				kind: payload.kind,
			});
			return { outcome: 'failed' };
		}
		try {
			if (handler.mode === 'result') {
				return { outcome: 'done', result: await handler.run(payload, context) };
			}
			if (handler.mode === 'detached') {
				await handler.run(payload, context);
				return { outcome: 'done' };
			}
			try {
				await handler.run(payload, { ...context, send });
			} catch (error) {
				handler.onError(error, send);
				return { outcome: 'failed' };
			}
			return { outcome: 'done' };
		} catch (error) {
			// A result turn reports its own errors in the reply. This is an unexpected failure.
			this.logger.warn('An agent turn failed', {
				turnId: context.turnId,
				kind: payload.kind,
				error,
			});
			return { outcome: 'failed' };
		}
	}
}
