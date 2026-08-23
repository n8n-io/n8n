import { generateNanoId } from '@n8n/db';

import type { WorkflowIdPolicy } from '../../n8n-packages.types';

/**
 * Decides the id a newly-created imported workflow gets. `new` mints a fresh id
 * (the source id is preserved separately as `sourceWorkflowId`); `source` reuses
 * the package's own id so re-imports map back to the same workflow.
 */
const WORKFLOW_ID_POLICIES: Record<WorkflowIdPolicy, (sourceWorkflowId: string) => string> = {
	new: () => generateNanoId(),
	source: (sourceWorkflowId) => sourceWorkflowId,
};

export function decideWorkflowId(policy: WorkflowIdPolicy, sourceWorkflowId: string): string {
	return WORKFLOW_ID_POLICIES[policy](sourceWorkflowId);
}
