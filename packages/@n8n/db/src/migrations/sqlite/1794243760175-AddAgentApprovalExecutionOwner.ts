import { AddAgentApprovalExecutionOwner1794243760175 as BaseMigration } from '../common/1794243760175-AddAgentApprovalExecutionOwner';

/** Keep Agent sessions and jobs when SQLite rebuilds their parent table. */
export class AddAgentApprovalExecutionOwner1794243760175 extends BaseMigration {
	withFKsDisabled = true as const;
}
