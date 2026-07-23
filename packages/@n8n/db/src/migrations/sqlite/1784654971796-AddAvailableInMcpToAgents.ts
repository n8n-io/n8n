import { AddAvailableInMcpToAgents1784654971796 as BaseMigration } from '../common/1784654971796-AddAvailableInMcpToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddAvailableInMcpToAgents1784654971796 extends BaseMigration {
	withFKsDisabled = true as const;
}
