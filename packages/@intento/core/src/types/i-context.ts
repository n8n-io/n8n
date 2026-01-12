import type { ITraceable } from 'types/i-traceable';
import type { IValidatable } from 'types/i-validatable';

/**
 * Base interface for n8n node context objects that support validation and logging.
 *
 * Combines validation capabilities (throwIfInvalid) with traceability (asLogMetadata)
 * for comprehensive error reporting. All context implementations must provide both
 * validation logic and log metadata extraction.
 */
export interface IContext extends IValidatable, ITraceable {}
