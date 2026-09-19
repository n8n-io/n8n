import type { DecisionAnswer, DecisionQuestions, DecisionState } from './schemas';

/**
 * A decision service scores bounded questions against a state object. The
 * compiler asks it what to build; it never asks it whether an action is
 * allowed. Implementations must never throw: every failure is a typed outcome
 * so callers can fail closed.
 */
export interface DecisionRequest {
	/** Stable name for logs and calibration, e.g. `workflow-compiler.intent`. */
	name: string;
	schemaVersion: string;
	state: DecisionState;
	questions: DecisionQuestions;
	abortSignal?: AbortSignal;
}

export type DecisionFailureReason =
	| 'unavailable'
	| 'timeout'
	| 'http_error'
	| 'malformed'
	| 'aborted';

export type DecisionOutcome =
	| {
			ok: true;
			answers: Record<string, DecisionAnswer>;
			model: string;
			latencyMs: number;
			reads?: number;
			/** Answers dropped or nulled during reconciliation. */
			problems: string[];
	  }
	| { ok: false; reason: DecisionFailureReason; message: string; latencyMs: number };

export interface DecisionService {
	/** Identifies the backend for logs: `systemone`, `model`, or `none`. */
	readonly kind: string;
	decide(request: DecisionRequest): Promise<DecisionOutcome>;
}

/** Decision service that always abstains. Used when nothing is configured and in tests. */
export class NullDecisionService implements DecisionService {
	readonly kind = 'none';

	async decide(): Promise<DecisionOutcome> {
		const message = 'No decision service is configured.';
		return { ok: false, reason: 'unavailable', message, latencyMs: 0 };
	}
}

/** One row of the decision log kept on a generation session for offline evaluation. */
export interface DecisionLogEntry {
	name: string;
	schemaVersion: string;
	backend: string;
	model?: string;
	latencyMs: number;
	reads?: number;
	ok: boolean;
	failureReason?: DecisionFailureReason;
	questionNames: string[];
	answers: Record<string, DecisionAnswer>;
	policy: Record<string, string>;
}
