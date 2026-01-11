import type { EventMessageTypes } from '@/eventbus/event-message-classes';

export interface LogStreamingEventMap {
	// Emitted by log-streaming module when a metric-worthy event occurs
	'log-streaming.metrics': EventMessageTypes;
}
