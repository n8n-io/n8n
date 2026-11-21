import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { JsonObject } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { busyEvent } from './agent-busy-event';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { type AgentTurnRequestPayload, isDurableTurnKind } from './agent-turn-request.types';
import {
	AgentTurnDuplicateError,
	type AgentTurnEnd,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
} from './agent-turn-runner';
import { InProcessTurnRunner } from './in-process-turn-runner';
import { QueuedTurnRunner } from './queued-turn-runner';

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

/**
 * How the hand-off of a turn that no caller waits for ended.
 *
 * - `accepted`: a runner took the turn, or the turn waits for a worker.
 * - `duplicate`: a turn with the same ID waits or runs already.
 * - `busy`: n8n has no room for the turn now. Nothing was stored.
 */
export type AgentSubmitResult =
	| { outcome: 'accepted' }
	| { outcome: 'duplicate' }
	| { outcome: 'busy'; retryAfterSeconds: number };

/** Kinds of work that already started and that no caller waits for. n8n never rejects them. */
const MUST_RUN_KINDS: ReadonlySet<Kind> = new Set(['wake', 'workflow-tool-resume']);

/**
 * The one entry point for agent turns that a service starts on behalf of a
 * caller. It picks the runner: the agent workers when one is up and the kind
 * can run there, else this process. The caller sees the same result in each
 * case, and never runs the turn itself.
 *
 * When agent workers are up, this main never runs a turn that can run on
 * them. The turn waits in the agent queue, or n8n rejects it.
 *
 * In agent queue mode, public turns (`PUBLIC_TURN_KINDS`) never run in this
 * process, and a webhook process runs no turn at all. With no agent worker,
 * n8n rejects such a turn as busy at once. A durable turn
 * (`DURABLE_TURN_KINDS`) is the exception: it waits in the agent queue until
 * a worker registers, see `submit`.
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
		private readonly queued: QueuedTurnRunner,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Whether a turn that can run on an agent worker goes to one now. */
	async goesToWorker(workerCapable = true): Promise<boolean> {
		return workerCapable && (await this.placement.workersAvailable());
	}

	/**
	 * The runner for a turn, or `no-worker` when the turn must run on an agent
	 * worker and none is registered.
	 */
	private async runnerFor(
		kind: Kind,
		workerCapable = true,
	): Promise<AgentTurnRunner | 'no-worker'> {
		if (!this.placement.mayRunHere(kind)) {
			return (await this.placement.workersAvailable()) ? this.queued : 'no-worker';
		}
		return (await this.goesToWorker(workerCapable)) ? this.queued : this.inProcess;
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
		const end = await this.run(await this.runnerFor(payload.kind), payload, delivery.abortSignal, {
			send: delivery.send,
			stopOnLeave: options.stopOnLeave,
		});
		if (end.outcome === 'rejected') delivery.send(busyEvent(end.reason, end.retryAfterSeconds));
		if (end.outcome === 'lost') {
			delivery.send({
				type: 'error',
				message: 'The agent stopped responding. Reload the chat to see its latest state.',
			});
		}
	}

	/** Run a turn whose caller waits for one reply. A caller that leaves stops the turn. */
	async result(
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
	): Promise<AgentDispatchResult> {
		const end = await this.run(await this.runnerFor(payload.kind), payload, abortSignal, {
			stopOnLeave: true,
		});
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
		const runner = await this.runnerFor(payload.kind, options.workerCapable);
		try {
			if (runner === 'no-worker') {
				throw new AgentTurnNotAdmittedError('no-worker', this.placement.rejectNoWorker());
			}
			await runner.start({
				turnId: randomUUID(),
				payload,
				mustRun: MUST_RUN_KINDS.has(payload.kind),
			});
		} catch (error) {
			if (!(error instanceof AgentTurnNotAdmittedError)) throw error;
			this.logger.warn('Skipped an agent turn, because n8n is busy', { kind: payload.kind });
			await options.onRejected?.();
		}
	}

	/**
	 * Hand off a turn that no caller waits for, under an ID that the caller
	 * picks, so that a retry of the same input is dropped.
	 *
	 * A durable turn (`DURABLE_TURN_KINDS`) resolves only when it is stored or
	 * rejected, so `accepted` always means stored. n8n rejects it only here: when
	 * the agent queue or the cap of its agent is full, or the queue is down. A
	 * stored durable turn waits for a worker, also when no worker is registered.
	 *
	 * Any other turn resolves at the latest after `ackWithinMs`, so that a
	 * platform that needs a fast answer gets one. A turn that still waits then
	 * counts as accepted. When n8n rejects it later, the turn is lost, and a
	 * warning is logged.
	 */
	async submit(
		payload: AgentTurnRequestPayload,
		{ turnId, ackWithinMs }: { turnId: string; ackWithinMs: number },
	): Promise<AgentSubmitResult> {
		const durable = isDurableTurnKind(payload.kind);
		let runner = await this.runnerFor(payload.kind);
		if (runner === 'no-worker') {
			if (!durable) {
				return { outcome: 'busy', retryAfterSeconds: this.placement.rejectNoWorker() };
			}
			runner = this.queued;
		}
		const settled = runner.start({ turnId, payload }).then(
			(): AgentSubmitResult => ({ outcome: 'accepted' }),
			(error: unknown): AgentSubmitResult => {
				if (error instanceof AgentTurnDuplicateError) return { outcome: 'duplicate' };
				if (error instanceof AgentTurnNotAdmittedError) {
					return { outcome: 'busy', retryAfterSeconds: error.retryAfterSeconds };
				}
				throw error;
			},
		);
		// A platform that got no answer sends the event again, and the stored row drops the copy.
		if (durable) return await settled;
		let timer: NodeJS.Timeout | undefined;
		const deadline = new Promise<'pending'>((resolve) => {
			timer = setTimeout(() => resolve('pending'), ackWithinMs);
		});
		try {
			const first = await Promise.race([settled, deadline]);
			if (first !== 'pending') return first;
		} finally {
			clearTimeout(timer);
		}
		settled
			.then((late) => {
				if (late.outcome !== 'busy') return;
				this.logger.warn(
					'Dropped an agent turn after its caller got an answer, because n8n is busy',
					{
						kind: payload.kind,
						turnId,
					},
				);
			})
			.catch((error: unknown) => {
				this.logger.warn('Failed to start an agent turn', { kind: payload.kind, turnId, error });
			});
		return { outcome: 'accepted' };
	}

	/**
	 * Subscribe, start and wait for the end of a turn. A caller that leaves
	 * while the turn waits for room always gives up its place. A caller that
	 * leaves while the turn runs stops it only with `stopOnLeave`, and then
	 * gets `cancelled` without waiting for the end.
	 */
	private async run(
		runner: AgentTurnRunner | 'no-worker',
		payload: AgentTurnRequestPayload,
		abortSignal: AbortSignal,
		{ send, stopOnLeave }: { send?: (event: AgentSseEvent) => void; stopOnLeave: boolean },
	): Promise<AgentTurnEnd> {
		if (runner === 'no-worker') {
			if (abortSignal.aborted) return { outcome: 'cancelled' };
			return {
				outcome: 'rejected',
				reason: 'no-worker',
				retryAfterSeconds: this.placement.rejectNoWorker(),
			};
		}
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
