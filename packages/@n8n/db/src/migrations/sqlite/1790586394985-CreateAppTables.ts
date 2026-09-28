import { CreateAppTables1790586394985 as BaseMigration } from '../common/1790586394985-CreateAppTables';

// Messages, checkpoints and grants cascade from threads; the recreate must not fire them.
export class CreateAppTables1790586394985 extends BaseMigration {
	withFKsDisabled = true as const;
}
