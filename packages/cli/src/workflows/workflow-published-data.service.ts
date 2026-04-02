import { Logger } from '@n8n/backend-common';
import { WorkflowPublishedVersionRepository, type SharedWorkflow } from '@n8n/db';
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
 * Source of truth for the workflow data that actually executes in production.
 *
 * Reads from the `workflow_published_version` table, which maps each workflow
 * to the specific history version that is currently deployed. Because workflow
 * publication is asynchronous, this may differ briefly from the
 * `workflow_entity` table (which reflects how the user has configured their
 * workflow).
 *
 * Callers should only use this service when the feature flag
 * (`N8N_USE_WORKFLOW_PUBLICATION_SERVICE`) is enabled. When the flag is off,
 * callers should continue using the legacy `activeVersion` relation directly.
 *
 * TODO: Add a caching layer to avoid a DB lookup on every trigger/poll/webhook
 * execution. The cache should be invalidated when the published version changes
 * (e.g. from the outbox consumer).
 */
@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		// This can happen legitimately: e.g. a workflow activated before the
		// publication service flag was enabled won't have a record yet, or
		// a workflow was just deactivated and the record was deleted.
		if (!record?.publishedVersion || !record.workflow) {
			this.logger.warn(`Published version record not found for workflow "${workflowId}"`);
			return null;
		}

		const { publishedVersion, workflow } = record;

		return {
			id: workflowId,
			name: workflow.name,
			nodes: publishedVersion.nodes,
			connections: publishedVersion.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			shared: workflow.shared ?? [],
		};
	}
}
