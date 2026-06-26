import { UnexpectedError } from 'n8n-workflow';

import type { StorageLocation } from './types';

export class SkippedEntryDeletionError extends UnexpectedError {
	constructor(loc: StorageLocation, count: number) {
		super(`Skipped deleting entries - "${loc}" store is not configured`, {
			extra: { count },
		});
	}
}
