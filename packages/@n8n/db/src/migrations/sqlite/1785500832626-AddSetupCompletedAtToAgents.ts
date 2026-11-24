import { AddSetupCompletedAtToAgents1785500832626 as BaseMigration } from '../common/1785500832626-AddSetupCompletedAtToAgents';

/**
 * Adding a column recreates `agents` on SQLite, and several agent tables have
 * CASCADE FKs to it. Disable FKs for the migration's duration.
 */
export class AddSetupCompletedAtToAgents1785500832626 extends BaseMigration {
	withFKsDisabled = true as const;
}
