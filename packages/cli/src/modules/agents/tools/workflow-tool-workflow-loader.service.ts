import { WorkflowsConfig } from '@n8n/config';
import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

export interface WorkflowToolWorkflowReference {
	workflowId?: string;
	workflowName: string;
}

export interface LoadWorkflowOptions {
	/**
	 * Load the published workflow version instead of the draft. Set for
	 * production agent runs, mirroring how sub-workflows resolve referenced
	 * workflows. Throws when the workflow has never been published.
	 */
	usePublishedVersion?: boolean;
	/**
	 * With `usePublishedVersion`, return the draft instead of throwing when the
	 * workflow has never been published. The build step uses this to register
	 * the tool from the draft schema; the call-time load stays strict.
	 */
	fallbackToDraft?: boolean;
}

@Service()
export class WorkflowToolWorkflowLoader {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {}

	async loadWorkflow(
		projectId: string,
		reference: WorkflowToolWorkflowReference,
		options: LoadWorkflowOptions = {},
	): Promise<WorkflowEntity | null> {
		const workflow = await this.workflowRepository.findOneByAgentToolReference(
			projectId,
			reference,
			{ withActiveVersion: options.usePublishedVersion === true },
		);
		if (!workflow || workflow.isArchived) return null;

		if (options.usePublishedVersion) {
			const published = await this.resolvePublishedContent(workflow);
			if (published) {
				Object.assign(workflow, { nodes: published.nodes, connections: published.connections });
			} else if (!options.fallbackToDraft) {
				throw new UserError(
					`Workflow "${workflow.name}" is not published. Publish it before using it in a production agent run.`,
				);
			}
		}

		return Object.assign(workflow, { pinData: undefined });
	}

	/** Mirrors the engine's published resolution in `workflow-execute-additional-data.ts`. */
	private async resolvePublishedContent(workflow: WorkflowEntity) {
		if (this.workflowsConfig.useWorkflowPublicationService) {
			const data = await this.workflowPublishedDataService.getPublishedWorkflowData(workflow.id);
			return data?.publishedVersion ?? null;
		}
		return workflow.activeVersion ?? null;
	}
}
