import { WorkflowsConfig } from '@n8n/config';
import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowPublishedDataService } from '@n8n/backend-services';

import { CallableWorkflowUnavailableError } from './callable-workflow-unavailable.error';

export interface CallableWorkflowReference {
	workflowId?: string;
	workflowName: string;
}

export interface LoadCallableWorkflowOptions {
	/**
	 * Load the published workflow version instead of the draft. Set for
	 * production runs, mirroring how sub-workflows resolve referenced
	 * workflows. Throws `CallableWorkflowUnavailableError` when the workflow has
	 * never been published.
	 */
	usePublishedVersion?: boolean;
}

/** Loads a workflow of a project that another feature runs as a callable, such as an agent tool. */
@Service()
export class CallableWorkflowLoader {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {}

	async loadWorkflow(
		projectId: string,
		reference: CallableWorkflowReference,
		options: LoadCallableWorkflowOptions = {},
	): Promise<WorkflowEntity | null> {
		const workflow = await this.workflowRepository.findOneByAgentToolReference(
			projectId,
			reference,
			{ withActiveVersion: options.usePublishedVersion === true },
		);
		if (!workflow || workflow.isArchived) return null;

		if (options.usePublishedVersion) {
			const published = await this.resolvePublishedContent(workflow);
			if (!published) {
				throw new CallableWorkflowUnavailableError(
					'not_published',
					`Workflow "${workflow.name}" is not published. Publish it so the published agent can use it.`,
				);
			}
			Object.assign(workflow, {
				versionId: published.versionId,
				nodes: published.nodes,
				connections: published.connections,
			});
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
