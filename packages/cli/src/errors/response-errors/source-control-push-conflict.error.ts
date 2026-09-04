import type { SourceControlledFile } from '@n8n/api-types';

import { ConflictError } from './conflict.error';

export class SourceControlPushConflictError extends ConflictError {
	constructor(conflicts: SourceControlledFile[]) {
		super('Push blocked by conflicting files. Pass `force: true` to push anyway.', undefined, {
			conflicts,
		});
	}
}
