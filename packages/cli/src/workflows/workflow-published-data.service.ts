import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	type SharedWorkflow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';

export interface PublishedWorkflowData {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	staticData: IDataObject | undefined;
	settings: IWorkflowSettings | undefined;
	shared: SharedWorkflow[];
}

/**
 * Service for loading the currently-published workflow data from the
 * `workflow_published_version` table.
 *
 * Callers should only use this service when the feature flag
 * (`N8N_USE_WORKFLOW_PUBLICATION_SERVICE`) is enabled. When the flag is off,
 * callers should continue using the legacy `activeVersion` relation directly.
 *
 * If no record exists in the published version table (e.g. for workflows
 * activated before the table was populated), falls back to `activeVersion`.
 *
 * TODO: Add a caching layer to avoid a DB lookup on every trigger/poll/webhook
 * execution. The cache should be invalidated when the published version changes
 * (e.g. from the outbox consumer).
 */
@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			this.logger.warn(
				`Published version record not found for workflow "${workflowId}", falling back to activeVersion`,
			);
			return await this.getFromActiveVersion(workflowId);
		}

		const { publishedVersion, workflow } = record;

		return {
			id: workflowId,
			name: publishedVersion.name ?? workflow.name,
			nodes: publishedVersion.nodes,
			connections: publishedVersion.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			shared: workflow.shared ?? [],
		};
	}

	private async getFromActiveVersion(workflowId: string): Promise<PublishedWorkflowData | null> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true, shared: { project: true } },
		});

		if (!workflow?.activeVersion) {
			return null;
		}

		const { activeVersion } = workflow;

		return {
			id: workflowId,
			name: workflow.name,
			nodes: activeVersion.nodes,
			connections: activeVersion.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			shared: workflow.shared ?? [],
		};
	}
}
