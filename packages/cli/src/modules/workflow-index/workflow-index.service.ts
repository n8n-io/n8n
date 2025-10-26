import { Logger } from '@n8n/backend-common';
import { WorkflowDependencies, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { INode, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

/**
 * Service for managing the workflow dependency index. The index tracks dependencies such as node types,
 * credentials, workflow calls, and webhook paths used by each workflow. The service builds the index on server start
 * and updates it in response to workflow-related events.
 */
@Service()
export class WorkflowIndexService {
	constructor(
		private readonly eventService: EventService,
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	init() {
		this.eventService.on('server-started', async (): Promise<void> => {
			this.logger.info('Building workflow dependency index...');
			await this.buildIndex().catch((e) => this.errorReporter.error(e));
		});
		this.eventService.on('workflow-created', async ({ workflow }) => {
			await this.updateIndexFor(workflow);
		});
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await this.updateIndexFor(workflow);
		});
		this.eventService.on('workflow-deleted', async ({ workflowId }) => {
			// Updating with an empty list effectively removes the existing dependencies.
			await this.dependencyRepository.removeDependenciesForWorkflow(workflowId);
		});
		this.eventService.on('workflow-archived', async ({ workflowId }) => {
			// Updating with an empty list effectively removes the existing dependencies.
			await this.dependencyRepository.removeDependenciesForWorkflow(workflowId);
		});
		this.eventService.on('workflow-unarchived', async ({ workflowId }) => {
			const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
			if (workflow) {
				await this.updateIndexFor(workflow);
			}
		});
	}

	private async buildIndex() {
		const batchSize = 100;
		let skip = 0;
		let processedCount = 0;

		while (true) {
			// Get only workflows that need indexing (unindexed or outdated).
			const workflows = await this.workflowRepository.findWorkflowsNeedingIndexing({
				take: batchSize,
				skip,
			});

			if (workflows.length === 0) {
				break;
			}

			// Build the index for each workflow in the batch.
			for (const workflow of workflows) {
				await this.updateIndexFor(workflow);
			}

			processedCount += workflows.length;
			this.logger.debug(`Indexed ${processedCount} workflows so far`);

			// If we got fewer workflows than the batch size, we're done.
			if (workflows.length < batchSize) {
				break;
			}

			skip += batchSize;
		}

		this.logger.info(
			`Finished building workflow dependency index. Processed ${processedCount} workflows.`,
		);
	}

	/**
	 * Update the dependency index for a given workflow.
	 *
	 * NOTE: this should generally be handled via events, rather than called directly.
	 * The exception is during workflow imports where it's simpler to call directly.
	 *
	 * @param workflow
	 */
	async updateIndexFor(workflow: IWorkflowBase) {
		// TODO: input validation.
		// Generate the dependency updates for the given workflow.
		const dependencyUpdates = new WorkflowDependencies(
			workflow.id,
			workflow.versionCounter,
			/*indexVersionId=*/ 1, // TODO: find a better way to manage this.
		);

		workflow.nodes.forEach((node) => {
			this.addNodeTypeDependencies(node, dependencyUpdates);
			this.addCredentialDependencies(node, dependencyUpdates);
			this.addWorkflowCallDependencies(node, dependencyUpdates);
			this.addWebhookPathDependencies(node, dependencyUpdates);
		});

		let updated: boolean;
		try {
			updated = await this.dependencyRepository.updateDependenciesForWorkflow(
				workflow.id,
				dependencyUpdates,
			);
		} catch (error) {
			this.logger.error(
				`Failed to update workflow dependency index for workflow ${workflow.id}: ${(error as Error).message}`,
			);
			return;
		}
		this.logger.debug(
			`Workflow dependency index ${updated ? 'updated' : 'skipped'} for workflow ${workflow.id}`,
		);
	}

	private addNodeTypeDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		dependencyUpdates.add({
			dependencyType: 'nodeType',
			dependencyKey: node.type,
			dependencyInfo: node.id,
		});
	}

	private addCredentialDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (!node.credentials) {
			return;
		}
		for (const credentialDetails of Object.values(node.credentials)) {
			const { id } = credentialDetails;
			dependencyUpdates.add({
				dependencyType: 'credentialId',
				dependencyKey: id,
				dependencyInfo: node.id,
			});
		}
	}

	private addWorkflowCallDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (node.type !== 'n8n-nodes-base.executeWorkflow') {
			return;
		}
		const calledWorkflowId: string | undefined = this.getWorkflowIdFrom(node);
		if (!calledWorkflowId) {
			return;
		}
		dependencyUpdates.add({
			dependencyType: 'workflowCall',
			dependencyKey: calledWorkflowId,
			dependencyInfo: node.id,
		});
	}

	private addWebhookPathDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (node.type !== 'n8n-nodes-base.webhook') {
			return;
		}
		const webhookPath = node.parameters.path as string;
		dependencyUpdates.add({
			dependencyType: 'webhookPath',
			dependencyKey: webhookPath,
			dependencyInfo: node.id,
		});
	}

	private getWorkflowIdFrom(node: INode): string | undefined {
		if (node.parameters?.['source'] === 'parameter') {
			return undefined; // The sub-workflow is provided directly in the parameters, so no dependency to track.
		}
		if (node.parameters?.['source'] === 'localFile') {
			return undefined; // The sub-workflow is provided via a local file, so no dependency to track.
		}
		if (node.parameters?.['source'] === 'url') {
			return undefined; // The sub-workflow is provided via a URL, so no dependency to track.
		}
		// If it's none of those sources, it must be 'workflowId'. This might be either directly as a string, or an object.
		if (typeof node.parameters?.['workflowId'] === 'string') {
			return node.parameters?.['workflowId'];
		}
		if (
			node.parameters &&
			typeof node.parameters['workflowId'] === 'object' &&
			node.parameters['workflowId'] !== null &&
			'value' in node.parameters['workflowId'] &&
			typeof node.parameters['workflowId']['value'] === 'string'
		) {
			return node.parameters['workflowId']['value'];
		}
		this.errorReporter.warn(
			`While indexing, could not determine called workflow ID from executeWorkflow node ${node.id}`,
		);
		return undefined;
	}
}
