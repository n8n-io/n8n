import { Logger } from '@n8n/backend-common';
import { WorkflowDependencies, WorkflowDependencyRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ensureError, INode, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

// A safety limit to prevent infinite loops in indexing.
const LOOP_LIMIT = 1_000_000_000;

// Placeholder key for workflows with no dependencies.
const WORKFLOW_INDEXED_PLACEHOLDER_KEY = '__INDEXED__';

/**
 * Service for managing the workflow dependency index. The index tracks dependencies such as node types,
 * credentials, workflow calls, and webhook paths used by each workflow. The service builds the index on server start
 * and updates it in response to workflow-related events.
 *
 * TODO(CAT-1595): Build the index on startup.
 * TODO(CAT-1597): Update the index in realtime.
 */
@Service()
export class WorkflowIndexService {
	constructor(
		private readonly dependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly eventService: EventService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly batchSize = 100,
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
			await this.dependencyRepository.removeDependenciesForWorkflow(workflowId);
		});
		this.eventService.on('workflow-activated', async ({ workflow }) => {
			await this.updateIndexFor(workflow);
		});
		this.eventService.on('workflow-deactivated', async ({ workflowId }) => {
			await this.dependencyRepository.removePublishedDependenciesForWorkflow(workflowId);
		});
	}

	async buildIndex() {
		const batchSize = this.batchSize;
		let processedCount = 0;

		while (processedCount < LOOP_LIMIT) {
			// Get only workflows that need indexing (unindexed or outdated).
			const workflows = await this.workflowRepository.findWorkflowsNeedingIndexing(batchSize);

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
		}

		if (processedCount >= LOOP_LIMIT) {
			const message = `Stopping workflow indexing because we hit the limit of ${LOOP_LIMIT} workflows. There's probably a bug causing an infinite loop.`;
			this.logger.warn(message);
			this.errorReporter.warn(new Error(message));
		}

		this.logger.info(
			`Finished building workflow dependency index. Processed ${processedCount} workflows.`,
		);
	}

	/**
	 * Update the dependency index for a given workflow.
	 * Indexes both draft and published versions separately.
	 *
	 * NOTE: this should generally be handled via events, rather than called directly.
	 * The exception is during workflow imports where it's simpler to call directly.
	 *
	 */
	async updateIndexFor(workflow: IWorkflowBase) {
		// Index draft version
		await this.indexVersion(workflow.id, workflow.versionCounter, workflow.nodes, 'draft');

		// Index published version if it exists
		if (workflow.activeVersionId) {
			try {
				const publishedVersion = await this.workflowHistoryService.getVersionInternal(
					workflow.id,
					workflow.activeVersionId,
				);

				await this.indexVersion(
					workflow.id,
					workflow.versionCounter,
					publishedVersion.nodes,
					'published',
				);
			} catch (e) {
				const error = ensureError(e);
				this.logger.error(
					`Failed to index published version for workflow ${workflow.id}: ${error.message}`,
				);
				this.errorReporter.error(error);
				// Continue - draft is indexed, published will be retried later
			}
		} else {
			// No active version - ensure published deps are removed
			try {
				await this.dependencyRepository.removePublishedDependenciesForWorkflow(workflow.id);
			} catch (e) {
				const error = ensureError(e);
				this.logger.error(
					`Failed to remove published dependencies for workflow ${workflow.id}: ${error.message}`,
				);
				this.errorReporter.error(error);
			}
		}
	}

	/**
	 * Index a specific version (draft or published) of a workflow.
	 */
	private async indexVersion(
		workflowId: string,
		workflowVersionId: number | undefined,
		nodes: INode[],
		versionType: 'draft' | 'published',
	): Promise<void> {
		const dependencyUpdates = new WorkflowDependencies(workflowId, workflowVersionId, versionType);

		this.extractDependenciesFromNodes(nodes, dependencyUpdates);

		try {
			const updated = await this.dependencyRepository.updateDependenciesForWorkflow(
				workflowId,
				dependencyUpdates,
			);
			this.logger.debug(
				`Workflow dependency index ${updated ? 'updated' : 'skipped'} for workflow ${workflowId} (${versionType})`,
			);
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(
				`Failed to update workflow dependency index for workflow ${workflowId} (${versionType}): ${error.message}`,
			);
			this.errorReporter.error(error);
		}
	}

	/**
	 * Extract dependencies from workflow nodes.
	 */
	private extractDependenciesFromNodes(
		nodes: INode[],
		dependencyUpdates: WorkflowDependencies,
	): void {
		nodes.forEach((node) => {
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
