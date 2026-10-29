import { WithCreatedAt } from '@n8n/db';
import { Entity, PrimaryColumn } from '@n8n/typeorm';

/**
 * One model call that already added budget spend.
 * `createdAt` is the handle for a later prune. Totals stay on `agent_budget_spend`.
 */
@Entity({ name: 'agent_budget_applied_call' })
export class AgentBudgetAppliedCall extends WithCreatedAt {
	/** Model call id. A second insert of the same id does not add spend. */
	@PrimaryColumn({
		type: 'uuid',
		comment: 'Model call id. A second insert of the same id does not add spend.',
	})
	callId: string;
}
