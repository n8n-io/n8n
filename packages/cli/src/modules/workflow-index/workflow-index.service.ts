import { Logger } from '@n8n/backend-common';
import { WorkflowDependency, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

@Service()
export class WorkflowIndexService {
	constructor(
		private readonly eventService: EventService,
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
	) {}

	init() {
		this.eventService.on('server-started', async () => {
			this.logger.info('Building workflow dependency index...');
			return this.buildIndex();
		});
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await this.updateIndexFor(workflow);
		});
	}

	private async buildIndex() {
		// Get all the workflows.
		const workflows = await this.workflowRepository.find();
		// Build the index for each workflow.
		for (const workflow of workflows) {
			await this.updateIndexFor(workflow);
		}
	}

	private async updateIndexFor(workflow: IWorkflowBase) {
		// TODO: input validation.
		// Generate the dependency updates for the given workflow.
		const dependencyUpdates: WorkflowDependency[] = [];

		this.addNodeTypeDependencies(workflow, dependencyUpdates);
		this.addCredentialDependencies(workflow, dependencyUpdates);
		this.addWorkflowCallDependencies(workflow, dependencyUpdates);
		this.addWebhookPathDependencies(workflow, dependencyUpdates);

		const updated = await this.dependencyRepository.updateDependenciesForWorkflow(
			workflow.id,
			dependencyUpdates,
		);
		this.logger.debug(
			`Workflow dependency index ${updated ? 'updated' : 'skipped'} for workflow ${workflow.id}`,
		);
	}

	private addNodeTypeDependencies(
		workflow: IWorkflowBase,
		dependencyUpdates: WorkflowDependency[],
	): void {
		// Iterate over the nodes, extract node types, and add to dependencyUpdates.
		workflow.nodes.forEach((node) => {
			const dependency = new WorkflowDependency();
			Object.assign(dependency, {
				workflowId: workflow.id,
				workflowVersionId: workflow.versionCounter,
				dependencyType: 'nodeType',
				dependencyKey: node.type,
				dependencyInfo: node.id,
				indexVersionId: 1, // TODO: figure out a better way to manage this.
			});
			dependencyUpdates.push(dependency);
		});
	}

	private addCredentialDependencies(
		workflow: IWorkflowBase,
		dependencyUpdates: WorkflowDependency[],
	): void {
		workflow.nodes
			.filter((node) => node.credentials) // Only include nodes with credentials.
			.forEach((node) => {
				// TODO: figure out if this is actually right, and what checks I need.
				const credentialType = Object.keys(node.credentials!)[0];
				const { id, name } = node.credentials![credentialType];
				const dependency = new WorkflowDependency();
				Object.assign(dependency, {
					workflowId: workflow.id,
					workflowVersionId: workflow.versionCounter,
					dependencyType: 'credential',
					dependencyKey: id,
					dependencyInfo: JSON.stringify({ nodeId: node.id, credentialType, credentialName: name }),
					indexVersionId: 1, // TODO: figure out a better way to manage this.
				});
				dependencyUpdates.push(dependency);
			});
	}

	private addWorkflowCallDependencies(
		workflow: IWorkflowBase,
		dependencyUpdates: WorkflowDependency[],
	): void {
		workflow.nodes
			.filter((node) => node.type === 'n8n-nodes-base.workflowCall') // Only include workflow call nodes.
			.forEach((node) => {
				const calledWorkflowId = node.parameters.workflowId as string;
				const dependency = new WorkflowDependency();
				Object.assign(dependency, {
					workflowId: workflow.id,
					workflowVersionId: workflow.versionCounter,
					dependencyType: 'workflowCall',
					dependencyKey: calledWorkflowId,
					dependencyInfo: node.id,
					indexVersionId: 1, // TODO: figure out a better way to manage this.
				});
				dependencyUpdates.push(dependency);
			});
	}

	private addWebhookPathDependencies(
		workflow: IWorkflowBase,
		dependencyUpdates: WorkflowDependency[],
	): void {
		workflow.nodes
			.filter((node) => node.type === 'n8n-nodes-base.webhook') // Only include webhook nodes.
			.forEach((node) => {
				const webhookPath = node.parameters.path as string;
				const dependency = new WorkflowDependency();
				Object.assign(dependency, {
					workflowId: workflow.id,
					workflowVersionId: workflow.versionCounter,
					dependencyType: 'webhookPath',
					dependencyKey: webhookPath,
					dependencyInfo: node.id,
					indexVersionId: 1, // TODO: figure out a better way to manage this.
				});
				dependencyUpdates.push(dependency);
			});
	}
}
