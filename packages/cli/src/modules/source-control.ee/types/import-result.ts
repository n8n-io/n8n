import type { ContentImportPolicyResult, WorkflowPublishBlockedDetails } from '@n8n/api-types';
import type { TagEntity, WorkflowTagMapping } from '@n8n/db';

export interface WorkflowImportResult {
	id: string;
	name: string;
	publishingError?: string;
	publishingErrorDetails?: WorkflowPublishBlockedDetails;
	/** Advisory only — never blocks the import. */
	contentImportPolicy?: ContentImportPolicyResult;
}

export interface ImportResult {
	workflows: WorkflowImportResult[];
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
