import type { TagEntity, WorkflowTagMapping } from '@n8n/db';

export type ExportableTags = { tags: TagEntity[]; mappings: WorkflowTagMapping[] };
