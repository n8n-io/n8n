import { AddServiceAccountUserIdToAgents1785900000000 as BaseMigration } from '../common/1785900000000-AddServiceAccountUserIdToAgents';

/**
 * Adding the column and the foreign key both recreate `agents` on SQLite, and
 * several agent tables have CASCADE FKs to it. Disable FKs for the migration's
 * duration so the recreation does not cascade-delete their rows.
 */
export class AddServiceAccountUserIdToAgents1785900000000 extends BaseMigration {
	withFKsDisabled = true as const;
}
