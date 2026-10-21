import { AddWaitingStatusToAgentExecution1792496430068 as BaseMigration } from '../common/1792496430068-AddWaitingStatusToAgentExecution';

/**
 * Replacing the status check rebuilds `agent_execution` on SQLite.
 * `agent_execution_message_links` and `agent_message_queue` reference it
 * with ON DELETE CASCADE. Foreign keys stay off so the rebuild keeps those rows.
 */
export class AddWaitingStatusToAgentExecution1792496430068 extends BaseMigration {
	withFKsDisabled = true as const;
}
