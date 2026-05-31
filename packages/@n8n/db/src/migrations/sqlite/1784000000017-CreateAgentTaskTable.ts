import { CreateAgentTaskTable1784000000017 as BaseMigration } from '../common/1784000000017-CreateAgentTaskTable';

/**
 * Adding the `taskId` FK recreates `agent_execution_threads` on SQLite, and the
 * CASCADE FK from `agent_execution.threadId` would wipe run history during that
 * recreate. Disable FKs for the migration's duration (the up/down logic is
 * inherited from the common base).
 */
export class CreateAgentTaskTable1784000000017 extends BaseMigration {
	withFKsDisabled = true as const;
}
