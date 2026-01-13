import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { SupplyRequestBase } from 'supply/supply-request-base';
import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

/**
 * Abstract base class for supply responses with latency tracking and dual-ID correlation.
 *
 * Links to parent request via agentRequestId and supplyRequestId for distributed tracing.
 * Calculates latency automatically from request timestamp to enable performance monitoring.
 * Subclasses must implement asDataObject() to define supply-specific response data structure.
 */
export abstract class SupplyResponseBase implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly supplyRequestId: string;
	readonly latencyMs: number;

	/**
	 * Initializes supply response with parent request IDs and calculated latency.
	 *
	 * Copies agentRequestId and supplyRequestId for request-response correlation in logs.
	 * Calculates latencyMs immediately from request.requestedAt - must construct when response received.
	 *
	 * @param request - Originating supply request containing IDs and timestamp for latency calculation
	 */
	constructor(request: SupplyRequestBase) {
		this.agentRequestId = request.agentRequestId;
		this.supplyRequestId = request.supplyRequestId;
		// NOTE: Latency calculated immediately - ensures accurate measurement at response time
		this.latencyMs = Date.now() - request.requestedAt;
	}

	/**
	 * Validates supply response fields and throws if invalid.
	 *
	 * Only validates IDs (agentRequestId, supplyRequestId) for required non-empty values.
	 * Note: latencyMs not validated - could be negative if clock adjusted backward.
	 *
	 * @throws Error if agentRequestId or supplyRequestId empty
	 */
	throwIfInvalid(): void {
		if (!this.agentRequestId || this.agentRequestId.trim() === '') throw new Error('"agentRequestId" is required');
		if (!this.supplyRequestId || this.supplyRequestId.trim() === '') throw new Error('"supplyRequestId" is required');
	}

	/**
	 * Returns metadata for structured logging and distributed tracing.
	 *
	 * Includes both agentRequestId (for request correlation) and supplyRequestId (for operation tracking).
	 * latencyMs enables performance analysis and timeout debugging.
	 *
	 * @returns Log metadata with parent request ID, supply ID, and calculated latency
	 */
	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			latencyMs: this.latencyMs,
		};
	}

	/**
	 * Converts supply response to n8n data object for workflow output.
	 *
	 * Subclasses define supply-specific fields (e.g., translated segments, detected language).
	 *
	 * @returns Data object with subclass-specific response data
	 */
	abstract asDataObject(): IDataObject;
}
