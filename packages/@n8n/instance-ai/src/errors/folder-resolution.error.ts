import { OperationalError } from 'n8n-workflow';

import type { FolderResolutionFailure } from '../types';

/**
 * A caller named a folder that could not be resolved to exactly one folder.
 *
 * Thrown instead of degrading silently: a write that lands at the project
 * root when the user asked for a folder is the failure folder addressing
 * exists to remove. Carries the same `FolderResolutionFailure` the list
 * action returns, so tools render both the same way.
 */
export class FolderResolutionError extends OperationalError {
	constructor(readonly folderResolution: FolderResolutionFailure) {
		super(`Folder "${folderResolution.requested}" could not be resolved`, { level: 'warning' });
	}
}
