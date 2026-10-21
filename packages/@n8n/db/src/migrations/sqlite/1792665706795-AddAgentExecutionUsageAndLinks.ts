import { AddAgentExecutionUsageAndLinks1792665706795 as BaseMigration } from '../common/1792665706795-AddAgentExecutionUsageAndLinks';

/** agent_execution has incoming cascading foreign keys. Keep its dependents during table recreation. */
export class AddAgentExecutionUsageAndLinks1792665706795 extends BaseMigration {
	withFKsDisabled = true as const;
}
