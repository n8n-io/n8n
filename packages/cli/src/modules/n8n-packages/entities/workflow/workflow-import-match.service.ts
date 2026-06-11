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

		const packageWorkflowIds = new Set(sourceWorkflowIds);
		const finderOptions = { includeActiveVersion: true, includeParentFolder: true } as const;
		const matchBySourceWorkflowId = new Map<string, WorkflowEntity>();

		const workflows = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			finderOptions,
		);

		for (const workflow of workflows) {
			if (!workflow.sourceWorkflowId) continue;

			const key = workflow.sourceWorkflowId;
			if (!packageWorkflowIds.has(key)) continue;

			if (matchBySourceWorkflowId.has(key)) {
				throw new UnexpectedError(
					'Multiple workflows in the target project share the same sourceWorkflowId',
					{ extra: { projectId, sourceWorkflowId: key } },
				);
			}

			matchBySourceWorkflowId.set(key, workflow);
		}

		for (const workflow of workflows) {
			if (workflow.sourceWorkflowId !== null) continue;

			const key = workflow.id;
			if (!packageWorkflowIds.has(key) || matchBySourceWorkflowId.has(key)) continue;

			matchBySourceWorkflowId.set(key, workflow);
		}

		return matchBySourceWorkflowId;
	}
}
