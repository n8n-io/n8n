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

	async list(projectId: string, workflowIds?: string[]): Promise<WorkflowToolListItem[]> {
		const owned = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]);
		const wanted = workflowIds ? new Set(workflowIds) : undefined;
		const ids = wanted ? owned.filter((id) => wanted.has(id)) : owned;
		if (ids.length === 0) return [];
		const workflows = await this.workflowRepository.findByIds(ids, {
			fields: ['name', 'description', 'isArchived'],
		});
		return workflows
			.filter((workflow) => !workflow.isArchived)
			.map((workflow) => ({
				workflowId: workflow.id,
				name: workflow.name,
				description: workflow.description ?? null,
			}));
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
