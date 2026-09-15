import type { ContentImportPolicyResult, WorkflowPublishBlockedDetails } from '@n8n/api-types';
import type { TagEntity, WorkflowTagMapping } from '@n8n/db';

export interface WorkflowImportResult {
	id: string;
	name: string;
	publishingError?: string;
	publishingErrorDetails?: WorkflowPublishBlockedDetails;
	/**
	 * Present when the content-import policy blocked this workflow, which means it was not
	 * imported. `checkErrors` stays empty: a check that cannot answer fails the whole pull, so
	 * it never lands on a single workflow's report.
	 */
	contentImportPolicy?: ContentImportPolicyResult;
}

export interface ImportResult {
	workflows: WorkflowImportResult[];
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
