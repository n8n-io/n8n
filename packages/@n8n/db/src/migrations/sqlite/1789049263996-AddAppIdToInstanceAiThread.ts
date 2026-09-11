import { AddAppIdToInstanceAiThread1789049263996 as BaseMigration } from '../common/1789049263996-AddAppIdToInstanceAiThread';

// Messages, checkpoints and grants cascade from threads; the recreate must not fire them.
export class AddAppIdToInstanceAiThread1789049263996 extends BaseMigration {
	withFKsDisabled = true as const;
}
