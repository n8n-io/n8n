import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentTurnGate, requestTurnClass } from './agent-turn-gate.service';
import { AgentTurnHandlers } from './agent-turn-handlers.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { isIngestTurnKind } from './agent-turn-request.types';
import {
	AgentTurnDuplicateError,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
	type AgentTurnStart,
	type AgentTurnSubscription,
} from './agent-turn-runner';
import { fanOut, runNumbered, type TurnListener as Listener } from './turn-fan-out';

/**
 * Runs agent turns in this process. `start` waits for room in the gate of
 * this process, then runs the handler of the turn in the background.
 *
 * An agent worker has its own job limit, so the gate does not apply there.
 * Ingest kinds (see `isIngestTurnKind`) make no model call, so the gate does
 * not count them either.
 *
 * A main or webhook process never runs a turn here that
 * `AgentTurnPlacement.mayRunHere` keeps off it, for example a public turn in
 * agent queue mode. `start` throws for such a turn, as a last check after
 * `AgentTurnDispatcher`.
 */
@Service()
export class InProcessTurnRunner implements AgentTurnRunner {
	private readonly listeners = new Map<string, Set<Listener>>();

	/** Turns that wait for room or run, by turn ID. */
	private readonly turns = new Map<string, AbortController>();

	/** Turns that run now. */
	private readonly running = new Set<Promise<void>>();

	constructor(
		private readonly cluster: AgentClusterService,
		private readonly gate: AgentTurnGate,
		private readonly handlers: AgentTurnHandlers,
		private readonly placement: AgentTurnPlacement,
	) {}

	async subscribe(turnId: string, listener: Listener): Promise<AgentTurnSubscription> {
		let set = this.listeners.get(turnId);
		if (!set) {
			set = new Set();
			this.listeners.set(turnId, set);
		}
		set.add(listener);
		return {
			close: () => {
				const current = this.listeners.get(turnId);
				current?.delete(listener);
				if (current?.size === 0) this.listeners.delete(turnId);
			},
		};
	}

	async start({ turnId, payload, mustRun = false }: AgentTurnStart): Promise<void> {
		if (this.turns.has(turnId)) throw new AgentTurnDuplicateError(turnId);
		// An agent worker runs public turns. `mayRunHere` is false there too, see its doc.
		if (!this.cluster.isWorker && !this.placement.mayRunHere(payload.kind)) {
			throw new UnexpectedError('An agent turn reached a process that must not run it', {
				extra: { kind: payload.kind, turnId },
			});
		}
		const abort = new AbortController();
		this.turns.set(turnId, abort);
		const admission =
			this.cluster.isWorker || isIngestTurnKind(payload.kind)
				? ({ admitted: true } as const)
				: await this.gate.waitForRoom(requestTurnClass(payload.kind), {
						abortSignal: abort.signal,
						untilRoom: mustRun,
					});
		if (!admission.admitted) {
			this.turns.delete(turnId);
			throw new AgentTurnNotAdmittedError(admission.reason, admission.retryAfterSeconds);
		}
		const run = runNumbered(
			this.handlers,
			payload,
			{ turnId, abortSignal: abort.signal },
			(entry) => fanOut(this.listeners.get(turnId) ?? [], entry),
		).finally(() => {
			this.turns.delete(turnId);
			this.running.delete(run);
		});
		this.running.add(run);
	}

	async cancel(turnId: string): Promise<void> {
		this.turns.get(turnId)?.abort();
	}

	/** Number of turns that run in this process now. */
	get runningCount(): number {
		return this.running.size;
	}

	/** Resolves when every turn that runs now has ended. */
	async whenIdle(): Promise<void> {
		await Promise.allSettled([...this.running]);
	}
}
