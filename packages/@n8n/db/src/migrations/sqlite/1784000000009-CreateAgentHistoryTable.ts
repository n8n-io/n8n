import { CreateAgentHistoryTable1784000000009 as BaseMigration } from '../common/1784000000009-CreateAgentHistoryTable';

/**
 * SQLite recreates `agents` whenever we add/drop columns, and the CASCADE FK
 * from `agent_history.agentId` → `agents.id` would wipe the freshly-copied
 * history rows during that recreate. Disable FKs for the migration's duration.
 * The up/down logic is inherited from the common base — only the flag (and
 * therefore the migration class name) differs from the Postgres run.
 */
export class CreateAgentHistoryTable1784000000009 extends BaseMigration {
	withFKsDisabled = true as const;
}
