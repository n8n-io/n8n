import { AddInstanceScopeToAgents1791238469895 as BaseMigration } from '../common/1791238469895-AddInstanceScopeToAgents';

/** `agents` has incoming cascading foreign keys. Recreating it must not delete their rows. */
export class AddInstanceScopeToAgents1791238469895 extends BaseMigration {
	withFKsDisabled = true as const;
}
