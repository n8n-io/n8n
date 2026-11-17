import { AddAgentApprovalExecutionOwner1794916567037 as BaseMigration } from '../common/1794916567037-AddAgentApprovalExecutionOwner';

/** Keep Agent sessions and jobs when SQLite rebuilds their parent table. */
export class AddAgentApprovalExecutionOwner1794916567037 extends BaseMigration {
	withFKsDisabled = true as const;
}
