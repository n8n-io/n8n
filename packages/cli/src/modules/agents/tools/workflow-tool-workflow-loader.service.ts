import { WorkflowsConfig } from '@n8n/config';
import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

export interface WorkflowToolWorkflowReference {
	workflowId?: string;
	workflowName: string;
}

@Service()
export class WorkflowToolWorkflowLoader {
	constructor(
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {}

	async loadPublishedWorkflow(
		projectId: string,
		reference: WorkflowToolWorkflowReference,
	): Promise<WorkflowEntity | null> {
		const accessibleWorkflow = await this.workflowRepository.findOneByAgentToolReference(
			projectId,
			reference,
		);
		if (!accessibleWorkflow || accessibleWorkflow.isArchived) return null;

		if (this.workflowsConfig.useWorkflowPublicationService) {
			const publishedWorkflow =
				await this.workflowPublishedDataService.getPublishedWorkflowDataForExecution(
					accessibleWorkflow.id,
				);
			if (!publishedWorkflow || publishedWorkflow.isArchived) return null;

			return Object.assign(accessibleWorkflow, publishedWorkflow, { pinData: undefined });
		}

		const workflow = await this.workflowRepository.findById(accessibleWorkflow.id);
		if (!workflow || workflow.isArchived || !workflow.activeVersion) return null;

		return Object.assign(workflow, {
			versionId: workflow.activeVersion.versionId,
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
			nodeGroups: workflow.activeVersion.nodeGroups,
			pinData: undefined,
		});
	}
}
