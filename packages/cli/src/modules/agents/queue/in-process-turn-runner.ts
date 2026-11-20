import type { AgentSseEvent } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import { AgentClusterService } from '../agent-cluster.service';
import { AgentTurnGate, requestTurnClass } from './agent-turn-gate.service';
import { AgentTurnHandlers } from './agent-turn-handlers.service';
import {
	type AgentTurnEnd,
	type AgentTurnEntry,
	AgentTurnNotAdmittedError,
	type AgentTurnRunner,
	type AgentTurnStart,
	type AgentTurnSubscription,
} from './agent-turn-runner';

type Listener = (entry: AgentTurnEntry) => void;

/**
 * Runs agent turns in this process. `start` waits for room in the gate of
 * this process, then runs the handler of the turn in the background.
 *
 * An agent worker has its own job limit, so the gate does not apply there.
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
		if (this.turns.has(turnId)) {
			throw new UnexpectedError('An agent turn with this ID already started', {
				extra: { turnId },
			});
		}
		const abort = new AbortController();
		this.turns.set(turnId, abort);
		const admission = this.cluster.isWorker
			? ({ admitted: true } as const)
			: await this.gate.waitForRoom(requestTurnClass(payload.kind), {
					abortSignal: abort.signal,
					untilRoom: mustRun,
				});
		if (!admission.admitted) {
			this.turns.delete(turnId);
			throw new AgentTurnNotAdmittedError(admission.reason, admission.retryAfterSeconds);
		}
		const run = this.run(turnId, payload, abort.signal).finally(() => {
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

	private async run(
		turnId: string,
		payload: AgentTurnStart['payload'],
		abortSignal: AbortSignal,
	): Promise<void> {
		let sequence = 0;
		const publish = (entry: { event: AgentSseEvent } | { end: AgentTurnEnd }) => {
			const numbered: AgentTurnEntry = { ...entry, sequence: ++sequence };
			for (const listener of this.listeners.get(turnId) ?? []) {
				try {
					listener(numbered);
				} catch {
					// A listener that fails must not stop the turn or the other listeners.
				}
			}
		};
		const end = await this.handlers.run(payload, { turnId, abortSignal }, (event) =>
			publish({ event }),
		);
		publish({ end: abortSignal.aborted ? { outcome: 'cancelled' } : end });
	}
}
