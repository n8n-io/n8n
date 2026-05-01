import type { TagEntity, WorkflowTagMapping } from '@n8n/db';

export interface WorkflowImportResult {
	id: string;
	name: string;
	publishingError?: string;
}

export interface ImportResult {
	workflows: WorkflowImportResult[];
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
