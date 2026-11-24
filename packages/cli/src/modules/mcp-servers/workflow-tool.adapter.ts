import {
	WorkflowToolPort,
	type WorkflowToolCheck,
	type WorkflowToolDescription,
	type WorkflowToolRunOptions,
	type WorkflowToolRunResult,
} from '@n8n/backend-module-mcp-servers';
import { Service } from '@n8n/di';

import { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';

/** Workflow tools of custom MCP servers. They run through the shared runner, as the server's project. */
@Service()
export class WorkflowToolAdapter extends WorkflowToolPort {
	constructor(private readonly runner: CallableWorkflowRunner) {
		super();
	}

	async check(projectId: string, workflowId: string): Promise<WorkflowToolCheck> {
		const checked = await this.runner.check(projectId, workflowId);
		// The module gets the verdict, never the workflow entity.
		return checked.callable ? { callable: true } : checked;
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
