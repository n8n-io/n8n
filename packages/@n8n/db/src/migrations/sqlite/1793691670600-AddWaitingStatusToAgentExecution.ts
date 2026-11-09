import { AddWaitingStatusToAgentExecution1793691670600 as BaseMigration } from '../common/1793691670600-AddWaitingStatusToAgentExecution';

/**
 * Replacing the status check rebuilds `agent_execution` on SQLite.
 * `agent_execution_message_links` and `agent_message_queue` reference it
 * with ON DELETE CASCADE. Foreign keys stay off so the rebuild keeps those rows.
 */
export class AddWaitingStatusToAgentExecution1793691670600 extends BaseMigration {
	withFKsDisabled = true as const;
}
