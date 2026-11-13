import { AddIdentityIdToAgents1794559557165 as BaseMigration } from '../common/1794559557165-AddIdentityIdToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddIdentityIdToAgents1794559557165 extends BaseMigration {
	withFKsDisabled = true as const;
}
