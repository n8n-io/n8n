import { type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class WorkflowImportMatchService {
	constructor(private readonly workflowFinderService: WorkflowFinderService) {}

	async findBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
	): Promise<Map<string, WorkflowEntity>> {
		if (sourceWorkflowIds.length === 0) return new Map();

		const workflows = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			{ includeActiveVersion: true, includeParentFolder: true },
		);

		const matchBySourceWorkflowId = new Map<string, WorkflowEntity>();

		for (const workflow of workflows) {
			// The finder query filters by `sourceWorkflowId IN (...)`, so a null
			// here should never happen.
			if (!workflow.sourceWorkflowId) {
				throw new UnexpectedError(
					'Matched workflow is missing its sourceWorkflowId despite the finder query filtering on it',
					{ extra: { workflowId: workflow.id } },
				);
			}
			const key = workflow.sourceWorkflowId;

			if (matchBySourceWorkflowId.has(key)) {
				throw new UnexpectedError(
					'Multiple workflows in the target project share the same sourceWorkflowId',
					{ extra: { projectId, sourceWorkflowId: key } },
				);
			}

			matchBySourceWorkflowId.set(key, workflow);
		}

		return matchBySourceWorkflowId;
	}
}
