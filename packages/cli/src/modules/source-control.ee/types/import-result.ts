import type { WorkflowPublishBlockedDetails } from '@n8n/api-types';
import type { TagEntity, WorkflowTagMapping } from '@n8n/db';
import type { PolicyCheckFailure, PolicyViolation } from '@n8n/decorators';

export interface WorkflowImportResult {
	id: string;
	name: string;
	publishingError?: string;
	publishingErrorDetails?: WorkflowPublishBlockedDetails;
	/** Advisory only — never blocks the import. */
	policyViolations?: PolicyViolation[];
	/** Checks that failed to run — a violation may have gone undetected. */
	checkErrors?: PolicyCheckFailure[];
}

export interface ImportResult {
	workflows: WorkflowImportResult[];
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
