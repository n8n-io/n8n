import type { TagEntity, WorkflowTagMapping } from '@n8n/db';

export type ExportableWorkflowTagMapping = Pick<WorkflowTagMapping, 'tagId' | 'workflowId'>;
export type ExportableTagEntity = Pick<TagEntity, 'id' | 'name'>;

export type ExportableTags = {
	tags: ExportableTagEntity[];
	mappings: ExportableWorkflowTagMapping[];
};
