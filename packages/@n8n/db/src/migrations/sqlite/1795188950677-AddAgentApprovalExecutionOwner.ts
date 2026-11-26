import { AddAgentApprovalExecutionOwner1795188950677 as BaseMigration } from '../common/1795188950677-AddAgentApprovalExecutionOwner';

/** Keep Agent sessions and jobs when SQLite rebuilds their parent table. */
export class AddAgentApprovalExecutionOwner1795188950677 extends BaseMigration {
	withFKsDisabled = true as const;
}
