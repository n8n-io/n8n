import {
	WorkflowToolPort,
	type WorkflowToolCheck,
	type WorkflowToolDescription,
	type WorkflowToolListItem,
	type WorkflowToolRunOptions,
	type WorkflowToolRunResult,
} from '@n8n/backend-module-mcp-servers';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';

/**
 * Each check loads the published version, so the picker checks a few workflows at a time.
 * Limit: each open of the picker checks every workflow of the project, so the cost grows with
 * the project size. A paged, searchable candidate list is a follow-up.
 */
const LIST_CHECK_BATCH_SIZE = 10;

/** Workflow tools of custom MCP servers. They run through the shared runner, as the server's project. */
@Service()
export class WorkflowToolAdapter extends WorkflowToolPort {
	constructor(
		private readonly runner: CallableWorkflowRunner,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {
		super();
	}

	async list(projectId: string): Promise<WorkflowToolListItem[]> {
		const ids = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]);
		const workflows = (
			await this.workflowRepository.findByIds(ids, {
				fields: ['name', 'description', 'isArchived'],
			})
		).filter((workflow) => !workflow.isArchived);

		const items: WorkflowToolListItem[] = [];
		for (let i = 0; i < workflows.length; i += LIST_CHECK_BATCH_SIZE) {
			const batch = workflows.slice(i, i + LIST_CHECK_BATCH_SIZE);
			items.push(
				...(await Promise.all(
					batch.map(async (workflow) => ({
						workflowId: workflow.id,
						name: workflow.name,
						description: workflow.description ?? null,
						check: await this.check(projectId, workflow.id),
					})),
				)),
			);
		}
		return items;
	}

	async check(projectId: string, workflowId: string): Promise<WorkflowToolCheck> {
		return await this.runner.check(projectId, workflowId);
	}

	async describe(projectId: string, workflowId: string): Promise<WorkflowToolDescription> {
		return await this.runner.describe(projectId, workflowId);
	}

	async run(
		projectId: string,
		workflowId: string,
		input: unknown,
		options: WorkflowToolRunOptions,
	): Promise<WorkflowToolRunResult> {
		return await this.runner.run(projectId, workflowId, input, options);
	}
}
