import { Service } from '@n8n/di';

/**
 * Whether a user still consents to a workflow running on their behalf.
 *
 * SPIKE: backed by an in-memory map so the identity path can be exercised end
 * to end without a schema change. The real implementation reads the
 * `workflow_credential_binding` row, whose `(workflowId, userId)` pair is the
 * grant itself; revoking it must also deprovision the user's scheduled jobs,
 * which a database cascade cannot do on its own.
 */
@Service()
export class RunnerBindingService {
	private readonly active = new Set<string>();

	private key(workflowId: string, userId: string) {
		return `${workflowId}:${userId}`;
	}

	grant(workflowId: string, userId: string) {
		this.active.add(this.key(workflowId, userId));
	}

	revoke(workflowId: string, userId: string) {
		this.active.delete(this.key(workflowId, userId));
	}

	async isActive(workflowId: string, userId: string): Promise<boolean> {
		return this.active.has(this.key(workflowId, userId));
	}
}
