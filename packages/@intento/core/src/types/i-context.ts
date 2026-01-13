import type { ITraceable } from 'types/i-traceable';

/**
 * Context interface for configuration objects with validation capability.
 *
 * Implementations must provide validation logic via throwIfInvalid() called by ContextFactory
 * after instantiation to catch configuration errors before execution begins.
 */
export interface IContext extends ITraceable {
	/**
	 * Validates context instance state and throws if invalid.
	 *
	 * Called by ContextFactory after construction to fail fast on bad configuration.
	 * Must check required fields and validate boundary constraints.
	 *
	 * @throws Error if required fields missing
	 * @throws RangeError if values outside valid boundaries
	 */
	throwIfInvalid(): void;
}
