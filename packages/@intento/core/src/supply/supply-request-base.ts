import type { IDataObject, LogMetadata } from 'n8n-workflow';

import type { AgentRequestBase } from 'agents/agent-request-base';
import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

/**
 * Abstract base class for supply requests with unique IDs and timestamp tracking.
 *
 * Links to parent AgentRequestBase via agentRequestId for request correlation.
 * Generates unique supplyRequestId to track individual supply operations within agent request.
 * Subclasses must implement asDataObject() to define supply-specific data structure.
 */
export abstract class SupplyRequestBase implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly supplyRequestId: string;
	readonly requestedAt: number;

	/**
	 * Initializes supply request with parent request ID, unique supply ID, and timestamp.
	 *
	 * Copies agentRequestId for request correlation in distributed tracing.
	 * Generates new supplyRequestId via crypto.randomUUID() for operation tracking.
	 * Captures timestamp immediately for accurate latency calculations in error handling.
	 *
	 * @param request - Parent agent request containing agentRequestId for correlation
	 */
	constructor(request: AgentRequestBase) {
		this.agentRequestId = request.agentRequestId;
		this.supplyRequestId = crypto.randomUUID();
		this.requestedAt = Date.now();
	}

	/**
	 * Validates supply request fields and throws if invalid.
	 *
	 * Only validates IDs (agentRequestId, supplyRequestId) for required non-empty values.
	 * Note: requestedAt not validated - assumed valid from Date.now().
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
	 * requestedAt enables latency calculations in SupplyError.
	 *
	 * @returns Log metadata with parent request ID, supply ID, and timestamp
	 */
	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			requestedAt: this.requestedAt,
		};
	}

	/**
	 * Converts supply request to n8n data object for workflow output.
	 *
	 * Subclasses define supply-specific fields (e.g., translation segments, language pairs).
	 *
	 * @returns Data object with subclass-specific supply parameters
	 */
	abstract asDataObject(): IDataObject;
}
