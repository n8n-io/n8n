import type { WorkflowExecuteMode } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

export interface ScopeKey {
	value: string;
	/** If true, n8n releases the scope after the task. */
	singleUse: boolean;
}

export function buildExecutionScopeKey(
	executionId: string | undefined,
	mode: WorkflowExecuteMode,
): ScopeKey {
	if (!executionId) return { value: `r:${randomUUID()}`, singleUse: true };

	const value = mode === 'manual' ? `e:${executionId}:manual` : `e:${executionId}`;

	return { value, singleUse: false };
}
