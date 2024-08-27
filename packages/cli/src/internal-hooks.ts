import { Service } from 'typedi';
import { Telemetry } from '@/telemetry';
import { MessageEventBus } from './eventbus/message-event-bus/message-event-bus';

/**
 * @deprecated Do not add to this class. It will be removed once we remove
 * further dep cycles. To add log streaming or telemetry events, use
 * `EventService` to emit the event and then use the `LogStreamingEventRelay` or
 * `TelemetryEventRelay` to forward them to the event bus or telemetry.
 */
@Service()
export class InternalHooks {
	constructor(
		private readonly telemetry: Telemetry,
		// Can't use @ts-expect-error because only dev time tsconfig considers this as an error, but not build time
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore - needed until we decouple telemetry
		private readonly _eventBus: MessageEventBus, // needed until we decouple telemetry
	) {}

	async init() {
		await this.telemetry.init();
	}
}
