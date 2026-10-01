import { OperationalError } from 'n8n-workflow';

import type { StorageLocation } from './types';

export class SkippedEntryDeletionError extends OperationalError {
	constructor(loc: StorageLocation, count: number) {
		super(`Skipped deleting entries - "${loc}" store is not configured`, {
			extra: { count },
		});
	}
}
