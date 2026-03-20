import type { InstanceAiEvent } from '@n8n/api-types';

/**
 * Domain-level write-only sink for chat stream events.
 *
 * Transport fan-out, buffering, sync handoff, and connection management are
 * handled by the CLI module. The instance-ai package only publishes semantic
 * events into this sink.
 */
export interface InstanceAiEventSink {
	publish(threadId: string, event: InstanceAiEvent): void;
}
