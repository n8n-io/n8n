import type { AuthenticatedN8nApiClient } from '@/n8n-api-client/authenticated-n8n-api-client';
import { CredentialApiClient } from '@/n8n-api-client/credentials-api-client';
import type { Workflow, Credential } from '@/n8n-api-client/n8n-api-client.types';
import { WorkflowApiClient } from '@/n8n-api-client/workflows-api-client';
import type { LoadableScenarioData } from '@/scenario/scenario-data-loader';

/**
 * Imports scenario data into an n8n instance
 */
export class ScenarioDataImporter {
	private readonly workflowApiClient: WorkflowApiClient;
	private readonly credentialApiClient: CredentialApiClient;

	constructor(n8nApiClient: AuthenticatedN8nApiClient) {
		this.workflowApiClient = new WorkflowApiClient(n8nApiClient);
		this.credentialApiClient = new CredentialApiClient(n8nApiClient);
	}

	private replaceValuesInObject(obj: unknown, searchText: string, targetText: string) {
		if (Array.isArray(obj)) {
			obj.map((item) => this.replaceValuesInObject(item, searchText, targetText));
		} else if (typeof obj === 'object' && obj !== null) {
			for (const [key, value] of Object.entries(obj)) {
				if (typeof value === 'string' && value === searchText) {
					(obj as Record<string, unknown>)[key] = targetText;
				} else {
					this.replaceValuesInObject(value, searchText, targetText);
				}
			}
		}
	}

	async importTestScenarioData(data: LoadableScenarioData) {
		const existingWorkflows = await this.workflowApiClient.getAllWorkflows();
		const existingCredentials = await this.credentialApiClient.getAllCredentials();

		for (const credential of data.credentials) {
			const createdCredential = await this.importCredentials({ existingCredentials, credential });

			// We need to update the id and name of the credential in the workflows
			for (const workflow of data.workflows) {
				this.replaceValuesInObject(workflow, credential.id, createdCredential.id);
				this.replaceValuesInObject(workflow, credential.name, createdCredential.name);
			}
		}

		for (const workflow of data.workflows) {
			await this.importWorkflow({ existingWorkflows, workflow });
		}
	}

	/**
	 * Imports a single credential into n8n removing any existing credentials with the same name
	 * @param opts
	 * @returns
	 */
	private async importCredentials(opts: {
		existingCredentials: Credential[];
		credential: Credential;
	}) {
		const existingCredentials = this.findExistingCredentials(
			opts.existingCredentials,
			opts.credential,
		);
		if (existingCredentials.length > 0) {
			for (const toDelete of existingCredentials) {
				await this.credentialApiClient.deleteCredential(toDelete.id);
			}
		}

		return await this.credentialApiClient.createCredential({
			...opts.credential,
			name: this.getBenchmarkCredentialName(opts.credential),
		});
	}

	/**
	 * Imports a single workflow into n8n removing any existing workflows with the same name
	 */
	private async importWorkflow(opts: { existingWorkflows: Workflow[]; workflow: Workflow }) {
		const existingWorkflows = this.findExistingWorkflows(opts.existingWorkflows, opts.workflow);
		if (existingWorkflows.length > 0) {
			for (const toDelete of existingWorkflows) {
				await this.workflowApiClient.archiveWorkflow(toDelete.id);
				await this.workflowApiClient.deleteWorkflow(toDelete.id);
			}
		}

		const createdWorkflow = await this.workflowApiClient.createWorkflow({
			...opts.workflow,
			name: this.getBenchmarkWorkflowName(opts.workflow),
		});

		return await this.workflowApiClient.activateWorkflow(createdWorkflow);
	}

	private findExistingCredentials(
		existingCredentials: Credential[],
		credentialToImport: Credential,
	): Credential[] {
		const benchmarkCredentialName = this.getBenchmarkCredentialName(credentialToImport);

		return existingCredentials.filter(
			(existingCredential) => existingCredential.name === benchmarkCredentialName,
		);
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

	private getBenchmarkCredentialName(credential: Credential) {
		return `[BENCHMARK] ${credential.name}`;
	}

	private getBenchmarkWorkflowName(workflow: Workflow) {
		return `[BENCHMARK] ${workflow.name}`;
	}
}
