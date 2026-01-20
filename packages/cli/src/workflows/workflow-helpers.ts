import type {
	SharedWorkflow,
	WorkflowRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import type { IConnections, IDataObject, INode, IWorkflowSettings } from 'n8n-workflow';

export interface PublishedWorkflowData {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	staticData: IDataObject | undefined;
	settings: IWorkflowSettings | undefined;
	shared?: SharedWorkflow[];
}

/**
 * Load published workflow data from either workflow_published_version table
 * or legacy workflow_entity.activeVersion based on feature flag
 */
export async function getPublishedWorkflowData(
	workflowId: string,
	workflowRepository: WorkflowRepository,
	workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	useNewTable: boolean,
): Promise<PublishedWorkflowData | null> {
	if (useNewTable) {
		// New path: Read from workflow_published_version table
		const publishedVersion = await workflowPublishedVersionRepository.findOne({
			where: { workflowId },
			relations: ['publishedVersion', 'workflow', 'workflow.shared', 'workflow.shared.project'],
		});

		if (!publishedVersion) {
			return null;
		}

		const { workflow, publishedVersion: historyVersion } = publishedVersion;

		return {
			id: workflow.id,
			name: historyVersion.name ?? workflow.name,
			nodes: historyVersion.nodes,
			connections: historyVersion.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			shared: workflow.shared,
		};
	} else {
		// Legacy path: Read from workflow_entity.activeVersion
		const workflow = await workflowRepository.findOne({
			where: { id: workflowId },
			relations: {
				activeVersion: true,
				shared: { project: { projectRelations: true } },
			},
		});

		if (!workflow?.activeVersion) {
			return null;
		}

		return {
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			shared: workflow.shared,
		};
	}
}
