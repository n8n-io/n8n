import { Logger } from '@n8n/backend-common';
import type { IWorkflowDb } from '@n8n/db';
import { WorkflowDependencies, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ensureError, INode, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';

// A safety limit to prevent infinite loops in indexing.
const LOOP_LIMIT = 1_000_000_000;

// Placeholder key for workflows with no dependencies.
const WORKFLOW_INDEXED_PLACEHOLDER_KEY = '__INDEXED__';

/**
 * Service for managing the workflow dependency index. The index tracks dependencies such as node types,
 * credentials, workflow calls, and webhook paths used by each workflow. The service builds the index on server start
 * and updates it in response to workflow-related events.
 *
 */
@Service()
export class WorkflowIndexService {
	constructor(
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly eventService: EventService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly batchSize = 100,
	) {}

	init() {
		this.eventService.on('server-started', async (): Promise<void> => {
			this.logger.info('Building workflow dependency index...');
			await this.buildIndex().catch((e) => this.errorReporter.error(e));
		});
		this.eventService.on('workflow-created', async ({ workflow }) => {
			await this.updateIndexForDraft(workflow);
		});
		this.eventService.on('workflow-saved', async ({ workflow }) => {
			await this.updateIndexForDraft(workflow);
		});
		this.eventService.on('workflow-deleted', async ({ workflowId }) => {
			await this.dependencyRepository.removeDependenciesForWorkflow(workflowId);
		});
		this.eventService.on('workflow-activated', async ({ workflow }) => {
			if (workflow.activeVersionId === null) {
				this.logger.warn(
					`Workflow ${workflow.id} activated with null activeVersionId. Skipping index update.`,
				);
				return;
			}
			await this.updateIndexForPublished(workflow, workflow.activeVersionId);
		});
	}

	async buildIndex() {
		const draftCount = await this.buildIndexInternal(
			async (batchSize) => await this.workflowRepository.findWorkflowsNeedingIndexing(batchSize),
			'draft',
		);

		const publishedCount = await this.buildIndexInternal(
			async (batchSize) =>
				await this.workflowRepository.findWorkflowsNeedingPublishedVersionIndexing(batchSize),
			'published',
		);

		this.logger.info(
			`Finished building workflow dependency index. Processed ${draftCount} draft workflows, ${publishedCount} published workflows.`,
		);
	}

	private async buildIndexInternal(
		unindexedWorkflowFinder: (batchSize: number) => Promise<IWorkflowDb[]>,
		dependencyType: 'draft' | 'published',
	): Promise<number> {
		const batchSize = this.batchSize;
		let processedCount = 0;

		while (processedCount < LOOP_LIMIT) {
			const workflows = await unindexedWorkflowFinder(batchSize);

			if (workflows.length === 0) {
				break;
			}

			// Build the index for each workflow in the batch.
			for (const workflow of workflows) {
				if (dependencyType === 'draft') {
					await this.updateIndexForDraft(workflow);
				} else {
					// We know activeVersionId is not null here because the finder only returns workflows
					// that have a published version.
					await this.updateIndexForPublished(workflow, workflow.activeVersionId!);
				}
			}

			processedCount += workflows.length;
			this.logger.debug(`Indexed ${processedCount} ${dependencyType} workflows so far`);

			// If we got fewer workflows than the batch size, we're done.
			if (workflows.length < batchSize) {
				break;
			}
		}

		if (processedCount >= LOOP_LIMIT) {
			const message = `Stopping ${dependencyType} workflow indexing because we hit the limit of ${LOOP_LIMIT} workflows. There's probably a bug causing an infinite loop.`;
			this.logger.warn(message);
			this.errorReporter.warn(new Error(message));
		}

		return processedCount;
	}

	async updateIndexForDraft(workflow: IWorkflowBase) {
		const dependencyUpdates = new WorkflowDependencies(
			workflow.id,
			workflow.versionCounter,
			/*publishedVersionId=*/ null,
		);
		return await this.updateIndexInternal(workflow, dependencyUpdates);
	}

	async updateIndexForPublished(workflow: IWorkflowBase, publishedVersionId: string) {
		const dependencyUpdates = new WorkflowDependencies(
			workflow.id,
			workflow.versionCounter,
			publishedVersionId,
		);
		return await this.updateIndexInternal(workflow, dependencyUpdates);
	}
	/**
	 * Update the dependency index for a given workflow.
	 *
	 * NOTE: this should generally be handled via events, rather than called directly.
	 * The exception is during workflow imports where it's simpler to call directly.
	 *
	 */
	private async updateIndexInternal(
		workflow: IWorkflowBase,
		dependencyUpdates: WorkflowDependencies,
	) {
		workflow.nodes.forEach((node) => {
			this.addNodeTypeDependencies(node, dependencyUpdates);
			this.addCredentialDependencies(node, dependencyUpdates);
			this.addWorkflowCallDependencies(node, dependencyUpdates);
			this.addWebhookPathDependencies(node, dependencyUpdates);
		});

		// If no dependencies were extracted, add a placeholder to mark the workflow as indexed
		if (dependencyUpdates.dependencies.length === 0) {
			dependencyUpdates.add({
				dependencyType: 'workflowIndexed',
				dependencyKey: WORKFLOW_INDEXED_PLACEHOLDER_KEY,
				dependencyInfo: null,
			});
		}

		let updated: boolean;
		try {
			updated = await this.dependencyRepository.updateDependenciesForWorkflow(
				workflow.id,
				dependencyUpdates,
			);
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(
				`Failed to update workflow ${dependencyUpdates.publishedVersionId ? 'published' : 'draft'} dependency index for workflow ${workflow.id}: ${error.message}`,
			);
			this.errorReporter.error(error);
			return;
		}
		this.logger.debug(
			`Workflow ${dependencyUpdates.publishedVersionId ? 'published' : 'draft'} dependency index ${updated ? 'updated' : 'skipped'} for workflow ${workflow.id}`,
		);
	}

	private addNodeTypeDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (node.type) {
			dependencyUpdates.add({
				dependencyType: 'nodeType',
				dependencyKey: node.type,
				dependencyInfo: { nodeId: node.id, nodeVersion: node.typeVersion },
			});
		}
	}

	private addCredentialDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (!node.credentials) {
			return;
		}
		for (const credentialDetails of Object.values(node.credentials)) {
			const { id } = credentialDetails;
			if (!id) {
				continue;
			}
			dependencyUpdates.add({
				dependencyType: 'credentialId',
				dependencyKey: id,
				dependencyInfo: { nodeId: node.id, nodeVersion: node.typeVersion },
			});
		}
	}

	private addWorkflowCallDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (node.type !== 'n8n-nodes-base.executeWorkflow') {
			return;
		}
		const calledWorkflowId: string | undefined = this.getCalledWorkflowIdFrom(node);
		if (!calledWorkflowId) {
			return;
		}
		dependencyUpdates.add({
			dependencyType: 'workflowCall',
			dependencyKey: calledWorkflowId,
			dependencyInfo: { nodeId: node.id, nodeVersion: node.typeVersion },
		});
	}

	private addWebhookPathDependencies(node: INode, dependencyUpdates: WorkflowDependencies): void {
		if (node.type !== 'n8n-nodes-base.webhook') {
			return;
		}
		const webhookPath = node.parameters.path as string;
		if (webhookPath) {
			dependencyUpdates.add({
				dependencyType: 'webhookPath',
				dependencyKey: webhookPath,
				dependencyInfo: { nodeId: node.id, nodeVersion: node.typeVersion },
			});
		}
	}

	private getCalledWorkflowIdFrom(node: INode): string | undefined {
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
			{ extra: node.parameters },
		);
		return undefined;
	}
}
