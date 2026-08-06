import { GlobalConfig } from '@n8n/config';
import {
	type PublishedWorkflowDataForExecution,
	WorkflowEntity,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

export type WorkflowToolWorkflowReference = {
	workflowId?: string;
	workflowName: string;
};

export type LoadedPublishedWorkflow = {
	workflow: WorkflowEntity;
	publishedVersionId: string;
};

@Service()
export class WorkflowToolWorkflowLoader {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	async loadPublishedWorkflow(
		projectId: string,
		reference: WorkflowToolWorkflowReference,
	): Promise<LoadedPublishedWorkflow | null> {
		const publishedData = this.globalConfig.workflows.useWorkflowPublicationService
			? await this.workflowPublishedVersionRepository.findPublishedWorkflowForAgentTool(
					projectId,
					reference,
				)
			: await this.workflowRepository.findPublishedWorkflowForAgentTool(projectId, reference);
		if (publishedData === null) return null;

		return {
			workflow: this.createExecutionSnapshot(publishedData),
			publishedVersionId: publishedData.versionId,
		};
	}

	async getPublishedVersionFingerprints(
		projectId: string,
		workflowIds: string[],
	): Promise<ReadonlyMap<string, string>> {
		const uniqueWorkflowIds = [...new Set(workflowIds)];
		if (uniqueWorkflowIds.length === 0) return new Map();

		const rows = this.globalConfig.workflows.useWorkflowPublicationService
			? await this.workflowPublishedVersionRepository.findPublishedVersionFingerprintsForAgentTools(
					projectId,
					uniqueWorkflowIds,
				)
			: await this.workflowRepository.findPublishedVersionFingerprintsForAgentTools(
					projectId,
					uniqueWorkflowIds,
				);
		const fingerprints = new Map<string, string>();
		for (const { workflowId, versionId } of rows) {
			fingerprints.set(workflowId, versionId);
		}
		return fingerprints;
	}

	private createExecutionSnapshot(data: PublishedWorkflowDataForExecution): WorkflowEntity {
		return Object.assign(new WorkflowEntity(), data, {
			pinData: undefined,
		});
	}
}
