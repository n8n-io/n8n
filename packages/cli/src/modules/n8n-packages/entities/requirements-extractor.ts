import type { WorkflowEntity } from '@n8n/db';

export interface RequirementsExtractor<TRequirement> {
	extract(workflow: WorkflowEntity): TRequirement[];
}
