import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { AgentRequestBase } from 'agents/agent-request-base';
import type { IDataProvider, ITraceable } from 'types/*';
import type { IValidatable } from 'types/i-validatable';

/**
 * Agent execution error with HTTP-style status codes and latency tracking.
 *
 * Created by AgentBase.onError() for timeout (408), abort (499), and unexpected (500) errors.
 * Immutable after construction (Object.freeze) to prevent modification during error propagation.
 * Links error to originating request via agentRequestId for distributed tracing.
 */
export class AgentError implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly code: number;
	readonly reason: string;
	readonly latencyMs: number;

	/**
	 * Creates agent error with HTTP status code and descriptive reason.
	 *
	 * Calculates latencyMs immediately - must be created when error occurs, not later.
	 * Status codes: 408 (timeout), 499 (abort), 500 (unexpected error).
	 *
	 * @param request - Originating agent request for ID and timestamp
	 * @param code - HTTP status code (100-599)
	 * @param reason - Human-readable error description for n8n display
	 */
	constructor(request: AgentRequestBase, code: number, reason: string) {
		this.agentRequestId = request.agentRequestId;
		this.code = code;
		this.reason = reason;
		this.latencyMs = Date.now() - request.requestedAt;

		// NOTE: Freeze prevents mutation during error propagation through agent/supplier layers
		Object.freeze(this);
	}

	/**
	 * Validates error instance state and throws if invalid.
	 *
	 * Checks required fields and HTTP status code range (100-599).
	 * Note: latencyMs always valid since calculated from Date.now() and positive requestedAt.
	 *
	 * @throws Error if agentRequestId or reason empty
	 * @throws RangeError if code outside 100-599 range
	 */
	throwIfInvalid(): void {
		if (!this.agentRequestId || this.agentRequestId.trim() === '') throw new Error('"agentRequestId" is required');
		if (!this.reason || this.reason.trim() === '') throw new Error('"reason" is required');
		if (this.code < 100 || this.code > 599) throw new RangeError('"code" must be a valid HTTP status code (100-599)');
	}

	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			code: this.code,
			reason: this.reason,
			latencyMs: this.latencyMs,
		};
	}

	asDataObject(): IDataObject {
		return {
			code: this.code,
			reason: this.reason,
			latencyMs: this.latencyMs,
		};
	}
}
