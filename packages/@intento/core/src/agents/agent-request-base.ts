import type { LogMetadata, IDataObject } from 'n8n-workflow';

import type { IDataProvider, ITraceable, IValidatable } from 'types/*';

/**
 * Abstract base class for agent requests with unique ID and timestamp tracking.
 *
 * Subclasses must implement asDataObject() to define request-specific data structure.
 * Automatically generates UUID and captures creation timestamp for latency calculations.
 */
export abstract class AgentRequestBase implements IValidatable, ITraceable, IDataProvider {
	readonly agentRequestId: string;
	readonly requestedAt: number;

	/**
	 * Initializes request with auto-generated UUID and current timestamp.
	 *
	 * UUID generation via crypto.randomUUID() ensures globally unique tracking.
	 * Timestamp captured immediately for accurate latency measurement in error handling.
	 */
	constructor() {
		this.agentRequestId = crypto.randomUUID();
		this.requestedAt = Date.now();
	}

	/**
	 * Validates base request fields and throws if invalid.
	 *
	 * Only validates agentRequestId (required, non-empty).
	 * Note: requestedAt not validated - assumed valid from Date.now().
	 *
	 * @throws Error if agentRequestId missing or empty
	 */
	throwIfInvalid(): void {
		if (!this.agentRequestId || this.agentRequestId.trim() === '') throw new Error('"agentRequestId" is required');
	}

	asLogMetadata(): LogMetadata {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}

	/**
	 * Converts request to n8n data object for workflow output.
	 *
	 * Subclasses define request-specific fields (e.g., segments, language).
	 *
	 * @returns Data object with subclass-specific request parameters
	 */
	abstract asDataObject(): IDataObject;
}
