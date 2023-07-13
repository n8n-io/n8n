import type { TagEntity } from '@db/entities/TagEntity';
import type { WorkflowTagMapping } from '@db/entities/WorkflowTagMapping';

export interface ImportResult {
	workflows: Array<{
		id: string;
		name: string;
	}>;
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { imported: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
