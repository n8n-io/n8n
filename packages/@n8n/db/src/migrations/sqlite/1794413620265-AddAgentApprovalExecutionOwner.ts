import { AddAgentApprovalExecutionOwner1794413620265 as BaseMigration } from '../common/1794413620265-AddAgentApprovalExecutionOwner';

/** Keep Agent sessions and jobs when SQLite rebuilds their parent table. */
export class AddAgentApprovalExecutionOwner1794413620265 extends BaseMigration {
	withFKsDisabled = true as const;
}
