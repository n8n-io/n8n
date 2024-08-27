import type { AuthenticatedN8nApiClient } from '@/n8nApiClient/authenticatedN8nApiClient';
import type { Workflow } from '@/n8nApiClient/n8nApiClient.types';
import { WorkflowApiClient } from '@/n8nApiClient/workflowsApiClient';

/**
 * Imports scenario data into an n8n instance
 */
export class ScenarioDataImporter {
	private readonly workflowApiClient: WorkflowApiClient;

	constructor(n8nApiClient: AuthenticatedN8nApiClient) {
		this.workflowApiClient = new WorkflowApiClient(n8nApiClient);
	}

	async importTestScenarioData(workflows: Workflow[]) {
		const existingWorkflows = await this.workflowApiClient.getAllWorkflows();

		for (const workflow of workflows) {
			await this.importWorkflow({ existingWorkflows, workflow });
		}
	}

	/**
	 * Imports a single workflow into n8n removing any existing workflows with the same name
	 */
	private async importWorkflow(opts: { existingWorkflows: Workflow[]; workflow: Workflow }) {
		const existingWorkflows = this.findExistingWorkflows(opts.existingWorkflows, opts.workflow);
		if (existingWorkflows.length > 0) {
			for (const toDelete of existingWorkflows) {
				await this.workflowApiClient.deleteWorkflow(toDelete.id);
			}
		}

		const createdWorkflow = await this.workflowApiClient.createWorkflow({
			...opts.workflow,
			name: this.getBenchmarkWorkflowName(opts.workflow),
		});

		return await this.workflowApiClient.activateWorkflow(createdWorkflow);
	}

	private findExistingWorkflows(
		existingWorkflows: Workflow[],
		workflowToImport: Workflow,
	): Workflow[] {
		const benchmarkWorkflowName = this.getBenchmarkWorkflowName(workflowToImport);

		return existingWorkflows.filter(
			(existingWorkflow) => existingWorkflow.name === benchmarkWorkflowName,
		);
	}

	private getBenchmarkWorkflowName(workflow: Workflow) {
		return `[BENCHMARK] ${workflow.name}`;
	}
}
