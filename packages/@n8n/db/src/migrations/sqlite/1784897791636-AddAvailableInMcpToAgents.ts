import { AddAvailableInMcpToAgents1784897791636 as BaseMigration } from '../common/1784897791636-AddAvailableInMcpToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddAvailableInMcpToAgents1784897791636 extends BaseMigration {
	withFKsDisabled = true as const;
}
