import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import type { Variables } from '@/databases/entities/Variables';
import type { TagEntity } from '@/databases/entities/TagEntity';
import type { WorkflowTagMapping } from '@/databases/entities/WorkflowTagMapping';

export interface ImportResult {
	workflows: Array<{
		id: string;
		name: string;
	}>;
	credentials: CredentialsEntity[];
	variables: Variables[];
	tags: { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
	removedFiles?: string[];
}
