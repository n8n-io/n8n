import type { WorkflowEntity } from '@n8n/db';

import type { WorkflowDecision } from './workflow-import.types';
import { decideImportConflictAction } from '../import-conflict-policy';
import type { WorkflowConflictPolicy } from '../../n8n-packages.types';

export function decideWorkflowConflictAction(
	policy: WorkflowConflictPolicy,
	existing: WorkflowEntity | null,
): WorkflowDecision {
	return decideImportConflictAction(policy, existing !== null);
}
