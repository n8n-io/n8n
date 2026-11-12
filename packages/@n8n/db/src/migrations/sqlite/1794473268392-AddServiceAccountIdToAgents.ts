import { AddServiceAccountIdToAgents1794473268392 as BaseMigration } from '../common/1794473268392-AddServiceAccountIdToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddServiceAccountIdToAgents1794473268392 extends BaseMigration {
	withFKsDisabled = true as const;
}
