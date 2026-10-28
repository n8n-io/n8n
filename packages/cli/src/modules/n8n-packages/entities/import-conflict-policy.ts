import type { ImportConflictPolicy } from '../n8n-packages.types';

export interface ImportDecision {
	action: 'create' | 'update' | 'skip';
	blocked: boolean;
}

/* eslint-disable @typescript-eslint/naming-convention -- Package policy keys */
const CONFLICT_POLICIES: Record<ImportConflictPolicy, (exists: boolean) => ImportDecision> = {
	'new-version': (exists) => ({ action: exists ? 'update' : 'create', blocked: false }),
	fail: (exists) => ({ action: 'create', blocked: exists }),
	skip: (exists) => ({ action: exists ? 'skip' : 'create', blocked: false }),
};
/* eslint-enable @typescript-eslint/naming-convention */

export function decideImportConflictAction(
	policy: ImportConflictPolicy,
	exists: boolean,
): ImportDecision {
	return CONFLICT_POLICIES[policy](exists);
}
