import type { AgentSseEvent } from '@n8n/api-types';
import type { JsonObject } from 'n8n-workflow';

import type { AgentTurnRejectReason } from './agent-queue-metrics';
import type { AgentTurnRequestPayload } from './agent-turn-request.types';

/**
 * How a turn ended.
 *
 * - `done`: the turn ran to its end. A turn whose caller waits for one reply
 *   carries the reply in `result`.
 * - `failed`: the turn threw. A streamed turn already sent its error event.
 * - `lost`: the process that ran the turn stopped before the turn ended.
 * - `cancelled`: `cancel` stopped the turn.
 * - `rejected`: no process started the turn in time. The caller can try
 *   again after `retryAfterSeconds`.
 */
export type AgentTurnEnd =
	| { outcome: 'done'; result?: JsonObject }
	| { outcome: 'failed' }
	| { outcome: 'lost' }
	| { outcome: 'cancelled' }
	| { outcome: 'rejected'; reason: AgentTurnRejectReason; retryAfterSeconds: number };

/**
 * One entry of a turn. Entries of a turn have consecutive sequence numbers,
 * from 1. The last entry is the `end` entry.
 */
export type AgentTurnEntry =
	| { sequence: number; event: AgentSseEvent }
	| { sequence: number; end: AgentTurnEnd };

/** The input of a turn. Plain data, so that it can cross a process or a network. */
export interface AgentTurnStart {
	/** The caller picks the ID, so that it can subscribe before the turn starts. */
	turnId: string;
	payload: AgentTurnRequestPayload;
	/**
	 * Wait for room for as long as it takes, and never reject. For work that
	 * already started and that no caller can retry, such as a wake.
	 */
	mustRun?: boolean;
}

export interface AgentTurnSubscription {
	close: () => void;
}

/**
 * Thrown by `start` when n8n has no room for the turn now. Nothing ran.
 * `left` means that `cancel` stopped the turn while it waited for room.
 */
export class AgentTurnNotAdmittedError extends Error {
	constructor(
		readonly reason: AgentTurnRejectReason | 'left',
		readonly retryAfterSeconds: number,
	) {
		super(`The agent turn was not admitted: ${reason}`);
		this.name = 'AgentTurnNotAdmittedError';
	}
}

/**
 * Runs agent turns somewhere: in this process, or on an agent worker.
 *
 * The interface is shaped like a network API, so that a later runner can
 * live in another service, such as the data plane of engine v2:
 * - inputs and outputs are plain data, with no callbacks into the caller,
 * - `start` either admits the turn or throws `AgentTurnNotAdmittedError`,
 * - `cancel` and `subscribe` address a turn by its ID,
 * - entries carry sequence numbers, so a gap is visible.
 *
 * Subscribe before `start`. A runner does not keep entries for a later
 * subscriber.
 */
export interface AgentTurnRunner {
	subscribe(
		turnId: string,
		listener: (entry: AgentTurnEntry) => void,
	): Promise<AgentTurnSubscription>;

	/**
	 * Start a turn. Resolves when the turn was admitted, which can take a while
	 * when n8n is busy. The turn then runs on its own.
	 */
	start(turn: AgentTurnStart): Promise<void>;

	/** Stop a turn, or its wait for room. Does nothing when the turn already ended. */
	cancel(turnId: string): Promise<void>;
}
