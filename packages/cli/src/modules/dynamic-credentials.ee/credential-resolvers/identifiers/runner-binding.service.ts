import { WorkflowCredentialBindingRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Whether a person still consents to a workflow running on their behalf.
 *
 * A thin read over the `workflow_credential_binding` row, whose
 * `(workflowId, userId)` pair is the grant itself. Kept as its own service so the
 * credential resolver depends on the question rather than on the table: the
 * resolver runs on the hot path of every unattended run and has no business
 * knowing how consent is stored.
 *
 * Withdrawing consent does not stop the scheduler on its own — the jobs a grant
 * made possible have to be deprovisioned by the service that created them. This
 * check is the backstop for the window in between.
 */
@Service()
export class RunnerBindingService {
	constructor(private readonly bindings: WorkflowCredentialBindingRepository) {}

	async isActive(workflowId: string, userId: string): Promise<boolean> {
		return await this.bindings.isActive(workflowId, userId);
	}
}
