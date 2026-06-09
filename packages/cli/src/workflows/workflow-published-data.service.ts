import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublishedVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError, type IConnections, type INode, type IWorkflowBase } from 'n8n-workflow';

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowsConfig: WorkflowsConfig,
	) {}

	/**
	 * Resolves the nodes/connections to execute for a workflow's production
	 * (published) version, centralizing the source-of-truth selection that every
	 * production execution path shares:
	 *
	 * - Returns `null` when the workflow has no published version — the caller
	 *   decides how to react (throw, log-and-skip, etc.). The `activeVersionId`
	 *   pre-check means an unpublished workflow never reaches the published-version
	 *   lookup, so its `null` branch keeps meaning "real bug" for trigger reads.
	 * - Behind the flag, reads from the `workflow_published_version` mapping;
	 *   otherwise from the `activeVersion` relation on the passed-in workflow
	 *   (which the caller must have loaded).
	 */
	async resolveProductionVersion(
		workflow: Pick<IWorkflowBase, 'activeVersionId' | 'activeVersion'>,
		workflowId: string,
	): Promise<{ nodes: INode[]; connections: IConnections } | null> {
		if (!workflow.activeVersionId) return null;

		if (this.workflowsConfig.useWorkflowPublicationService) {
			const published = await this.getPublishedWorkflowData(workflowId);
			if (!published) return null;
			return {
				nodes: published.publishedVersion.nodes,
				connections: published.publishedVersion.connections,
			};
		}

		if (!workflow.activeVersion) return null;
		return {
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
		};
	}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and
	 * the `WorkflowHistory` row that the `workflow_published_version` mapping
	 * currently points at.
	 */
	async getPublishedWorkflowData(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory } | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		// Reached when no published_version mapping exists for the workflow. For
		// trigger reads this should never happen (the publication service stops
		// triggers before deleting the record), so it indicates a real bug.
		// Execution-path readers (sub-workflow, error workflow, MCP execute) may
		// also hit this for a workflow that simply isn't published; they treat a
		// null return as "not active".
		if (!record?.publishedVersion || !record.workflow) {
			this.errorReporter.error(
				new UnexpectedError('Published version record not found for workflow', {
					extra: { workflowId },
				}),
			);
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}
}
