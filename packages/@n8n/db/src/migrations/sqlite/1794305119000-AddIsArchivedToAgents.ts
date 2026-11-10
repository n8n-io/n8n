import { AddIsArchivedToAgents1794305119000 as BaseMigration } from '../common/1794305119000-AddIsArchivedToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddIsArchivedToAgents1794305119000 extends BaseMigration {
	withFKsDisabled = true as const;
}
