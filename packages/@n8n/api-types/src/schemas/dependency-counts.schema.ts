export interface DependencyTypeCounts {
	credentialId: number;
	dataTableId: number;
	errorWorkflow: number;
	errorWorkflowParent: number;
	workflowCall: number;
	workflowParent: number;
}

/**
 * Lightweight response for workflow cards — only the counts per type,
 * no resolved names / project IDs.  Keyed by resource ID.
 */
export type DependencyCountsBatchResponse = Record<string, DependencyTypeCounts>;
