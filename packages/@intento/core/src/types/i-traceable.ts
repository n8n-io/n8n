import type { LogMetadata } from 'n8n-workflow';

/**
 * Interface for objects that can provide structured logging metadata.
 *
 * Enables consistent error reporting and debugging by extracting relevant
 * context information in n8n's LogMetadata format. Used for enriching
 * error messages with actionable context.
 */
export interface ITraceable {
	/**
	 * Extracts structured logging metadata for error reporting.
	 *
	 * @returns LogMetadata containing relevant context for debugging and error analysis
	 */
	asLogMetadata(): LogMetadata;
}
