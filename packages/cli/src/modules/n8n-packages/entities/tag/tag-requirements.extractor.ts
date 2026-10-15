import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { WorkflowTagUsage } from './tag.types';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class TagRequirementsExtractor implements RequirementsExtractor<WorkflowTagUsage> {
	extract(workflow: WorkflowEntity): WorkflowTagUsage[] {
		return (workflow.tags ?? []).map((tag) => ({
			workflowId: workflow.id,
			tag: { id: tag.id, name: tag.name },
		}));
	}
}
