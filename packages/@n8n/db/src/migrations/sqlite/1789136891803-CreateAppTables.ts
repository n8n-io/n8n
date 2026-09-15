import { CreateAppTables1789136891803 as BaseMigration } from '../common/1789136891803-CreateAppTables';

// Messages, checkpoints and grants cascade from threads; the recreate must not fire them.
export class CreateAppTables1789136891803 extends BaseMigration {
	withFKsDisabled = true as const;
}
