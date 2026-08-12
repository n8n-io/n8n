import { UserError } from 'n8n-workflow';

/** Thrown when indexing or search runs before an embedding provider and vector store are set. */
export class KnowledgeNotConfiguredError extends UserError {
	constructor() {
		super(
			'Knowledge connectors are not configured. Set an embedding provider and a vector store first.',
			{ level: 'warning' },
		);
	}
}
