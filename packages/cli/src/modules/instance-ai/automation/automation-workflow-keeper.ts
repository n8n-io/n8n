import { InstanceWriteAccessService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowService } from '@/workflows/workflow.service';

import { AutomationTemporaryMarker } from './automation-temporary-marker';

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
		private readonly temporaryMarker: AutomationTemporaryMarker,
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
		const isTemporary = await this.temporaryMarker.isMarked(workflow.id);
		if (!workflow.isArchived && !isTemporary) return workflow.versionId;

		if (this.instanceWriteAccess.isReadOnly()) {
			throw new UserError(
				`This n8n instance is read-only, so "${workflow.name}" cannot be kept. Nothing was changed.`,
			);
		}
		const versionId = workflow.isArchived ? await this.restore(user, workflow) : workflow.versionId;
		if (isTemporary) await this.temporaryMarker.clear(user, workflow.id);
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
}
