import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { FindOptionsRelations } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError, type IConnections, type INode } from 'n8n-workflow';

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * The relations to join when a caller will read a workflow's production
	 * version via {@link extractProductionVersion}: the
	 * `workflow_published_version` mapping when the publication service is
	 * enabled, otherwise the `activeVersion` relation. Spread alongside any
	 * caller-specific relations so the production version is resolved in the same
	 * query as the workflow itself.
	 */
	productionVersionRelations(): FindOptionsRelations<WorkflowEntity> {
		return this.workflowsConfig.useWorkflowPublicationService
			? { publishedVersionMapping: { publishedVersion: true } }
			: { activeVersion: true };
	}

	/**
	 * Reads the production-version nodes/connections from a workflow that was
	 * loaded with {@link productionVersionRelations}. Returns `null` when the
	 * workflow has no published version — the caller decides how to react (throw,
	 * log-and-skip, etc.). The `activeVersionId` check short-circuits an
	 * unpublished workflow before we look at the version relation.
	 */
	extractProductionVersion(
		workflow: Pick<WorkflowEntity, 'activeVersionId' | 'activeVersion' | 'publishedVersionMapping'>,
	): { nodes: INode[]; connections: IConnections } | null {
		if (!workflow.activeVersionId) return null;

		const version = this.workflowsConfig.useWorkflowPublicationService
			? workflow.publishedVersionMapping?.publishedVersion
			: workflow.activeVersion;
		if (!version) return null;

		return { nodes: version.nodes, connections: version.connections };
	}

	/**
	 * Loads a workflow together with its production version in a single query.
	 * Returns `null` when the workflow does not exist; call
	 * {@link extractProductionVersion} on the result to read its nodes.
	 */
	async loadProductionWorkflow(
		workflowId: string,
		extraRelations: FindOptionsRelations<WorkflowEntity> = {},
	): Promise<WorkflowEntity | null> {
		return await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { ...this.productionVersionRelations(), ...extraRelations },
		});
	}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and
	 * the `WorkflowHistory` row that the `workflow_published_version` mapping
	 * currently points at. Used by the trigger read path (live webhooks).
	 */
	async getPublishedWorkflowData(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory } | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		// A missing mapping should never happen for trigger reads: the publication
		// service stops triggers before deleting the record, so it indicates a real
		// bug. (Execution-path readers go through extractProductionVersion, which
		// returns null silently instead.)
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
