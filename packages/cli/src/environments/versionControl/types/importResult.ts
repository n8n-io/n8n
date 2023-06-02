import type { TagEntity } from '@/databases/entities/TagEntity';
import type { WorkflowTagMapping } from '@/databases/entities/WorkflowTagMapping';

export interface ImportResult {
	workflows: Array<{
		id: string;
		name: string;
	}>;
	credentials: Array<{ id: string; name: string; type: string }>;
	variables: { added: string[]; changed: string[] };
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
