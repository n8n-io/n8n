import {
	WorkflowToolPort,
	type WorkflowToolCheck,
	type WorkflowToolDescription,
	type WorkflowToolListItem,
	type WorkflowToolRefusal,
	type WorkflowToolRunOptions,
	type WorkflowToolRunResult,
} from '@n8n/backend-module-mcp-servers';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	CallableWorkflowRunner,
	type CallableWorkflowRefusal,
} from '@/workflows/callable/callable-workflow-runner.service';

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
		const check = await this.runner.check(projectId, workflowId);
		if (check.callable) return check;
		return {
			callable: false,
			reason: await this.classifyRefusal(projectId, workflowId, check.reason),
		};
	}

	async describe(projectId: string, workflowId: string): Promise<WorkflowToolDescription> {
		const described = await this.runner.describe(projectId, workflowId);
		if (described.callable) return described;
		return {
			callable: false,
			reason: await this.classifyRefusal(projectId, workflowId, described.reason),
		};
	}

	async run(
		projectId: string,
		workflowId: string,
		input: unknown,
		options: WorkflowToolRunOptions,
	): Promise<WorkflowToolRunResult> {
		const result = await this.runner.run(projectId, workflowId, input, options);
		if (result.status !== 'refused') return result;
		return {
			status: 'refused',
			reason: await this.classifyRefusal(projectId, workflowId, result.reason),
		};
	}

	private async classifyRefusal(
		projectId: string,
		workflowId: string,
		reason: CallableWorkflowRefusal,
	): Promise<WorkflowToolRefusal> {
		if (reason !== 'not_found') return reason;
		// The builder can move the workflow back, so a move is not a delete.
		return (await this.isOwnedByAnotherProject(projectId, workflowId)) ? 'moved' : 'not_found';
	}

	private async isOwnedByAnotherProject(projectId: string, workflowId: string): Promise<boolean> {
		const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds([workflowId]);
		const owner = owners.get(workflowId);
		if (!owner || owner.id === projectId) return false;
		const [workflow] = await this.workflowRepository.findByIds([workflowId], {
			fields: ['isArchived'],
		});
		return !!workflow && !workflow.isArchived;
	}
}
