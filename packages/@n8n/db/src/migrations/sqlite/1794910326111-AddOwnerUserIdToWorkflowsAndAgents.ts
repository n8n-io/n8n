import { AddOwnerUserIdToWorkflowsAndAgents1794910326111 as BaseMigration } from '../common/1794910326111-AddOwnerUserIdToWorkflowsAndAgents';

/** `down()` recreates `workflow_entity` and `agents` on SQLite. Both have incoming cascading foreign keys, so keep their dependents. */
export class AddOwnerUserIdToWorkflowsAndAgents1794910326111 extends BaseMigration {
	withFKsDisabled = true as const;
}
