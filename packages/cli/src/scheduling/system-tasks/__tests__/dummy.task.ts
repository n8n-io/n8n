import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

@SystemTask()
export class DummySystemTask implements SystemTask {
	name = 'dummy';

	schedule: SystemTaskSchedule = intervalFromSeconds(60);

	effects: SystemTaskEffects = 'idempotent';

	placement: SystemTaskPlacement = { scope: 'cluster', durable: false };

	retryDelaySeconds?: number;

	maxAttempts?: number;

	misfireGraceSeconds?: number;

	runCount = 0;

	/** How a run settles. Replace it to make a run fail or to hold it open. */
	onRun: (signal: AbortSignal) => Promise<void> = async () => {};

	async run(signal: AbortSignal): Promise<void> {
		this.runCount++;
		await this.onRun(signal);
	}
}

@SystemTask()
export class OtherDummySystemTask extends DummySystemTask {
	name = 'other-dummy';
}

@SystemTask()
export class PerInstanceDummySystemTask extends DummySystemTask {
	name = 'per-instance-dummy';

	placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	};
}
