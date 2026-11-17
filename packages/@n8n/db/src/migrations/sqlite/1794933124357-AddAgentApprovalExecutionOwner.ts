import { AddAgentApprovalExecutionOwner1794933124357 as BaseMigration } from '../common/1794933124357-AddAgentApprovalExecutionOwner';

/** Keep Agent sessions and jobs when SQLite rebuilds their parent table. */
export class AddAgentApprovalExecutionOwner1794933124357 extends BaseMigration {
	withFKsDisabled = true as const;
}
