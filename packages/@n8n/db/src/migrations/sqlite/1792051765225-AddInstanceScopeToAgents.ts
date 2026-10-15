import { AddInstanceScopeToAgents1792051765225 as BaseMigration } from '../common/1792051765225-AddInstanceScopeToAgents';

/**
 * `agents` has incoming cascading foreign keys. Recreating it must not delete
 * their rows, so foreign keys are off for this migration. On revert, the rows
 * that depend on the deleted instance agents stay as orphans.
 */
export class AddInstanceScopeToAgents1792051765225 extends BaseMigration {
	withFKsDisabled = true as const;
}
