import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { busyEvent } from './agent-busy-event';
import { AgentRemoteTurnService } from './agent-remote-turn.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import type { AgentTurnRequestPayload } from './agent-turn-request.types';
import {
	type AgentTurnEnd,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
} from './agent-turn-runner';
import { InProcessTurnRunner } from './in-process-turn-runner';

type Kind = AgentTurnRequestPayload['kind'];

/** Where the main that holds the connection receives the events of a turn. */
export interface AgentTurnDelivery {
	send: (event: AgentSseEvent) => void;
	/** Aborts when the caller leaves. */
	abortSignal: AbortSignal;
}

/**
 * How a turn whose caller waits for one reply ended.
 *
 * - `done`: the turn ran and gave its reply.
 * - `lost`: the turn failed, or the process that ran it stopped.
 * - `left`: the caller left, so the turn was stopped.
 * - `busy`: n8n has no room for the turn now. The caller can try again after
 *   `retryAfterSeconds`.
 */
export type AgentDispatchResult =
	| { outcome: 'done'; result: JsonObject }
	| { outcome: 'lost' }
	| { outcome: 'left' }
	| { outcome: 'busy'; retryAfterSeconds: number };

/** Kinds of work that already started and that no caller waits for. n8n never rejects them. */
const MUST_RUN_KINDS: ReadonlySet<Kind> = new Set(['wake', 'workflow-tool-resume']);

/**
 * The one entry point for agent turns that a service starts on behalf of a
 * caller. It picks the runner: an agent worker when one is up and the kind
 * can run there, else this process. The caller sees the same result in each
 * case, and never runs the turn itself.
 *
 * Each runner admits the turn or rejects it. A rejected stream turn gets a
 * busy error event, a rejected result turn gets `busy`.
 */
@Service()
export class AgentTurnDispatcher {
	constructor(
		private readonly logger: Logger,
		private readonly placement: AgentTurnPlacement,
		private readonly inProcess: InProcessTurnRunner,
		private readonly remote: AgentRemoteTurnService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Whether a turn that can run on an agent worker goes to one now. */
	async goesToWorker(workerCapable = true): Promise<boolean> {
		return workerCapable && (await this.placement.workersAvailable());
	}

	/**
	 * Run a turn that streams events to the caller, and resolve when it ends
	 * or the caller leaves. With `stopOnLeave`, a caller that leaves stops the
	 * turn. Without it, the turn runs to its end.
	 */
	async stream(
		payload: AgentTurnRequestPayload,
		delivery: AgentTurnDelivery,
		options: { stopOnLeave: boolean },
	): Promise<void> {
		if (await this.goesToWorker()) {
			if (await this.remote.stream(payload, delivery, options)) return;
		}
		const end = await this.runHere(this.inProcess, payload, delivery.abortSignal, {
			send: delivery.send,
			stopOnLeave: options.stopOnLeave,
		});
		if (end.outcome === 'rejected') delivery.send(busyEvent(end.reason, end.retryAfterSeconds));
	}

	/** Run a turn whose caller waits for one reply. A caller that leaves stops the turn. */
	async result(
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
	): Promise<AgentDispatchResult> {
		if (await this.goesToWorker()) {
			const remote = await this.remote.result(payload, abortSignal);
			if (remote.outcome !== 'local') return remote;
		}
		const end = await this.runHere(this.inProcess, payload, abortSignal, { stopOnLeave: true });
		return this.toResult(end, abortSignal);
	}

	/**
	 * Start a turn that no caller waits for, and resolve once a runner took it
	 * or rejected it. n8n never rejects a wake or the resume of a workflow tool:
	 * they wait for room for as long as it takes. `onRejected` runs for a turn
	 * that n8n rejected, so that the caller can free what it holds.
	 */
	async detached(
		payload: AgentTurnRequestPayload,
		options: { workerCapable: boolean; onRejected?: () => Promise<void> },
	): Promise<void> {
		const startHere = async () => await this.startDetachedHere(payload, options.onRejected);
		if (await this.goesToWorker(options.workerCapable)) {
			if (await this.remote.detached(payload, startHere)) return;
		}
		await startHere();
	}

	private async startDetachedHere(
		payload: AgentTurnRequestPayload,
		onRejected?: () => Promise<void>,
	): Promise<void> {
		try {
			await this.inProcess.start({
				turnId: randomUUID(),
				payload,
				mustRun: MUST_RUN_KINDS.has(payload.kind),
			});
		} catch (error) {
			if (!(error instanceof AgentTurnNotAdmittedError)) throw error;
			this.logger.warn('Skipped an agent turn, because n8n is busy', { kind: payload.kind });
			await onRejected?.();
		}
	}

	/**
	 * Subscribe, start and wait for the end of a turn. A caller that leaves
	 * while the turn waits for room always gives up its place. A caller that
	 * leaves while the turn runs stops it only with `stopOnLeave`, and then
	 * gets `cancelled` without waiting for the end.
	 */
	private async runHere(
		runner: AgentTurnRunner,
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
		{ send, stopOnLeave }: { send?: (event: AgentSseEvent) => void; stopOnLeave: boolean },
	): Promise<AgentTurnEnd> {
		const turnId = randomUUID();
		let admitted = false;
		let resolveEnd!: (end: AgentTurnEnd) => void;
		const ended = new Promise<AgentTurnEnd>((resolve) => {
			resolveEnd = resolve;
		});
		const subscription = await runner.subscribe(turnId, (entry) => {
			if ('end' in entry) resolveEnd(entry.end);
			else send?.(entry.event);
		});
		const onLeave = () => {
			if (!admitted || stopOnLeave) void runner.cancel(turnId);
			resolveEnd({ outcome: 'cancelled' });
		};
		abortSignal.addEventListener('abort', onLeave, { once: true });
		try {
			if (abortSignal.aborted) return { outcome: 'cancelled' };
			try {
				await runner.start({ turnId, payload, mustRun: MUST_RUN_KINDS.has(payload.kind) });
			} catch (error) {
				if (!(error instanceof AgentTurnNotAdmittedError)) throw error;
				if (error.reason === 'left') return { outcome: 'cancelled' };
				return {
					outcome: 'rejected',
					reason: error.reason,
					retryAfterSeconds: error.retryAfterSeconds,
				};
			}
			admitted = true;
			return await ended;
		} finally {
			abortSignal.removeEventListener('abort', onLeave);
			subscription.close();
		}
	}

	private toResult(end: AgentTurnEnd, abortSignal: AbortSignal): AgentDispatchResult {
		switch (end.outcome) {
			case 'done':
				return end.result ? { outcome: 'done', result: end.result } : { outcome: 'lost' };
			case 'rejected':
				return { outcome: 'busy', retryAfterSeconds: end.retryAfterSeconds };
			case 'cancelled':
				return { outcome: 'left' };
			case 'failed':
			case 'lost':
				return abortSignal.aborted ? { outcome: 'left' } : { outcome: 'lost' };
		}
	}
}
