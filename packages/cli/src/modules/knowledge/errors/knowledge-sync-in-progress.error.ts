import { UserError } from 'n8n-workflow';

/** A sync was requested for a source that is already syncing — the caller should retry later. */
export class KnowledgeSyncInProgressError extends UserError {
	constructor(sourceId: string) {
		super(`A sync is already running for the knowledge source: '${sourceId}'`, {
			level: 'warning',
		});
	}
}
