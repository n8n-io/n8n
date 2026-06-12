import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowDecision } from './workflow-import.types';
import type { WorkflowConflictPolicy } from '../../n8n-packages.types';

/**
 * Decides what to do with a single workflow given the pre-existing target-project
 * workflow it would clash with (or `null` if none). Each policy is a pure function
 * of the existing workflow — no package contents, no writes.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API workflow conflict policy keys */
const WORKFLOW_CONFLICT_POLICIES: Record<
	WorkflowConflictPolicy,
	(existing: WorkflowEntity | null) => WorkflowDecision
> = {
	'new-version': (existing) => ({ action: existing ? 'update' : 'create', blocked: false }),
	fail: (existing) => ({ action: 'create', blocked: existing !== null }),
	skip: (existing) => ({ action: existing ? 'skip' : 'create', blocked: false }),
};
/* eslint-enable @typescript-eslint/naming-convention */

export function decideWorkflowConflictAction(
	policy: WorkflowConflictPolicy,
	existing: WorkflowEntity | null,
): WorkflowDecision {
	return WORKFLOW_CONFLICT_POLICIES[policy](existing);
}
