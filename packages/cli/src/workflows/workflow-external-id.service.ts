import { ExternalIdConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';

@Service()
export class WorkflowExternalIdService {
	constructor(
		private readonly externalIdConfig: ExternalIdConfig,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Resolves the `id`/`externalId` to persist for a new workflow.
	 *
	 * In MATCH_WORKFLOW_ID mode, ignores any client-supplied `externalId` and
	 * forces it to equal the workflow's own `id` — pre-generating that id here
	 * if it isn't already set, since `WorkflowEntity`'s `@BeforeInsert` id
	 * generation hook only runs during `.save()`, too late to read back before
	 * persisting a matching `externalId` in the same insert.
	 *
	 * In MUTABLE mode, leaves both fields untouched — any client-supplied
	 * `externalId` was already assigned via the create payload, and is
	 * validated for uniqueness here.
	 */
	async resolveOnCreate(newWorkflow: { id: string; externalId: string | null }): Promise<void> {
		if (this.externalIdConfig.workflowExternalId === 'MATCH_WORKFLOW_ID') {
			if (!newWorkflow.id) {
				newWorkflow.id = generateNanoId();
			}
			newWorkflow.externalId = newWorkflow.id;
			return;
		}

		if (!newWorkflow.externalId) return;

		const exists = await this.workflowRepository.existsBy({
			externalId: newWorkflow.externalId,
		});
		if (exists) {
			throw new ConflictError(
				`A workflow with External ID "${newWorkflow.externalId}" already exists.`,
			);
		}
	}

	/**
	 * In MATCH_WORKFLOW_ID mode, rejects any attempt to change the value (no-op
	 * if resubmitting the same value). In MUTABLE mode, any change is allowed.
	 */
	validateUpdate(currentValue: string | null, requestedValue: string | null | undefined): void {
		if (requestedValue === undefined) return; // not part of this update
		if (this.externalIdConfig.workflowExternalId !== 'MATCH_WORKFLOW_ID') return; // MUTABLE: anything goes
		if (requestedValue === currentValue) return; // no-op resubmission

		throw new BadRequestError(
			'External ID cannot be changed while N8N_WORKFLOW_EXTERNAL_ID is set to MATCH_WORKFLOW_ID.',
		);
	}
}
