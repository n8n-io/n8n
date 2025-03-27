import type { TagEntity } from '@/databases/entities/tag-entity';
import type { WorkflowTagMapping } from '@/databases/entities/workflow-tag-mapping';

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
