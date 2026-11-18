import { AddExternalThreadScope1794900000000 as BaseMigration } from '../common/1794900000000-AddExternalThreadScope';

/** Rebuilding `agent_execution_threads` on SQLite must keep the rows of tables that reference it. */
export class AddExternalThreadScope1794900000000 extends BaseMigration {
	withFKsDisabled = true as const;
}
