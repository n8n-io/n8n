import { GlobalConfig } from '@n8n/config';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { MessageEventBus } from './message-event-bus';

/**
 * Sends again the event messages that this process could not deliver to its
 * log streaming destinations.
 */
@SystemTask()
export class EventBusUnsentMessageFlushTask implements SystemTask {
	readonly name = 'event-bus-unsent-message-flush';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.globalConfig.eventBus.checkUnsentInterval,
	);

	/** The unsent messages are in the event log files of this process, so no other instance can send them. */
	readonly target = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	} satisfies SystemTaskTarget;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly eventBus: MessageEventBus,
	) {}

	async run(): Promise<void> {
		await this.eventBus.trySendingUnsent();
	}
}
