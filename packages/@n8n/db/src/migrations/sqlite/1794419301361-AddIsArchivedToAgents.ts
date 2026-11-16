import { AddIsArchivedToAgents1794419301361 as BaseMigration } from '../common/1794419301361-AddIsArchivedToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddIsArchivedToAgents1794419301361 extends BaseMigration {
	withFKsDisabled = true as const;
}
