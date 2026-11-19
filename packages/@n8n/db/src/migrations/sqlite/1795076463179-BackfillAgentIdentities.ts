import { BackfillAgentIdentities1795076463179 as BaseMigration } from '../common/1795076463179-BackfillAgentIdentities';

/**
 * The NOT NULL and FK changes recreate `agents` on SQLite, and several agent
 * tables have CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class BackfillAgentIdentities1795076463179 extends BaseMigration {
	withFKsDisabled = true as const;
}
