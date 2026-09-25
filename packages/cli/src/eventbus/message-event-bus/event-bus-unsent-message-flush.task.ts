import { GlobalConfig } from '@n8n/config';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

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

	/** A destination can receive a message twice if its confirmation is still in flight. */
	readonly effects: SystemTaskEffects = 'non-idempotent';

	/** The unsent messages are in the event log files of this process, so no other instance can send them. */
	readonly placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	};

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly eventBus: MessageEventBus,
	) {}

	async run(): Promise<void> {
		await this.eventBus.trySendingUnsent();
	}
}
