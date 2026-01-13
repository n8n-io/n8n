import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { AgentRequestBase } from 'agents/agent-request-base';
import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

/**
 * Abstract base class for agent responses with latency tracking and validation.
 *
 * Captures latency immediately at construction by calculating time elapsed since request.
 * Subclasses must implement asDataObject() to define response-specific data structure.
 * Preserves agentRequestId from request for correlation in logs and error tracking.
 */
export abstract class AgentResponseBase implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly latencyMs: number;

	/**
	 * Initializes response with request correlation ID and calculated latency.
	 *
	 * Latency calculated immediately to capture accurate execution time.
	 * Must be constructed when operation completes, not deferred.
	 *
	 * @param agentRequest - The originating request containing ID and timestamp
	 */
	constructor(agentRequest: AgentRequestBase) {
		this.agentRequestId = agentRequest.agentRequestId;
		// NOTE: Latency calculated immediately - ensures accurate measurement at completion time
		this.latencyMs = Date.now() - agentRequest.requestedAt;
	}

	/**
	 * Validates response fields and throws if invalid.
	 *
	 * Only validates agentRequestId (required, non-empty).
	 * Note: latencyMs not validated - assumed valid from Date.now() calculation.
	 *
	 * @throws Error if agentRequestId missing or empty
	 */
	throwIfInvalid(): void {
		if (!this.agentRequestId || this.agentRequestId.trim() === '') throw new Error('"agentRequestId" is required');
	}

	/**
	 * Returns metadata for structured logging and tracing.
	 *
	 * Includes agentRequestId for request correlation and latencyMs for performance tracking.
	 *
	 * @returns Log metadata with request ID and execution latency
	 */
	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			latencyMs: this.latencyMs,
		};
	}

	/**
	 * Converts response to n8n data object for workflow output.
	 *
	 * Subclasses define response-specific fields (e.g., translation result, segments).
	 *
	 * @returns Data object with subclass-specific response data
	 */
	abstract asDataObject(): IDataObject;
}
