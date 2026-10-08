import { InstanceWriteAccessService } from '@n8n/backend-services';
import { AiBuilderTemporaryWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowProvenanceService } from '../provenance/workflow-provenance.service';

/** The fields of the stored workflow that `keep` reads. */
export type KeptWorkflow = { id: string; name: string; isArchived: boolean; versionId: string };

/**
 * Keeps a workflow that the n8n Assistant built: restores it from the archive and clears its
 * AI-temporary marker, so that the run-end cleanup leaves it alone. Every step acts as the user,
 * so the usual scope checks apply.
 */
@Service()
export class AutomationWorkflowKeeper {
	constructor(
		private readonly workflowService: WorkflowService,
		private readonly temporaryWorkflowRepository: AiBuilderTemporaryWorkflowRepository,
		private readonly provenanceService: WorkflowProvenanceService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
	) {}

	/**
	 * Keeps the workflow and returns its saved version after that. Restoring a workflow saves a
	 * new version with the same content. A workflow that is neither archived nor temporary is
	 * kept already, so nothing changes.
	 *
	 * @throws UserError when the instance is read-only or the user cannot restore the workflow
	 */
	async keep(user: User, workflow: KeptWorkflow): Promise<string> {
		const isTemporary = await this.temporaryWorkflowRepository.existsForWorkflow(workflow.id);
		if (!workflow.isArchived && !isTemporary) return workflow.versionId;

		if (this.instanceWriteAccess.isReadOnly()) {
			throw new UserError(
				`This n8n instance is read-only, so "${workflow.name}" cannot be kept. Nothing was changed.`,
			);
		}
		const versionId = workflow.isArchived ? await this.restore(user, workflow) : workflow.versionId;
		if (isTemporary) await this.clearTemporaryMarker(user, workflow.id);
		return versionId;
	}

	private async restore(user: User, workflow: KeptWorkflow): Promise<string> {
		const restored = await this.workflowService.unarchive(user, workflow.id);
		// The caller checks the scope first, so only a change of access gets here.
		if (!restored) {
			throw new UserError(
				`You do not have permission to restore "${workflow.name}". Nothing was changed.`,
			);
		}
		return restored.versionId;
	}

	/** Records the chat that built the workflow, then removes the marker that names the chat. */
	private async clearTemporaryMarker(user: User, workflowId: string): Promise<void> {
		const threadId = await this.temporaryWorkflowRepository.findThreadIdForWorkflow(workflowId);
		if (threadId) await this.provenanceService.record(workflowId, threadId, user.id);
		await this.temporaryWorkflowRepository.unmark(workflowId);
	}
}
