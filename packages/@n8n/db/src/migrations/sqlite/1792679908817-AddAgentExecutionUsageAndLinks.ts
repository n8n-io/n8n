import { AddAgentExecutionUsageAndLinks1792679908817 as BaseMigration } from '../common/1792679908817-AddAgentExecutionUsageAndLinks';

/** `down()` recreates agent_execution on SQLite. It has incoming cascading foreign keys, so keep its dependents. */
export class AddAgentExecutionUsageAndLinks1792679908817 extends BaseMigration {
	withFKsDisabled = true as const;
}
