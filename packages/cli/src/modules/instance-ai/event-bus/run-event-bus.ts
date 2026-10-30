import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiEventBus } from '@n8n/instance-ai';

export interface RunEventObserver {
	observe(event: InstanceAiEvent): void;
}

/**
 * The event bus of one run: each observer sees every event the agent publishes,
 * then the display form of the event goes to the thread bus. An observer that
 * throws never stops the event from reaching the user.
 */
export function createRunEventBus(
	bus: InstanceAiEventBus,
	options: {
		observers: Array<RunEventObserver | undefined>;
		mapEvent?: (event: InstanceAiEvent) => InstanceAiEvent;
	},
): InstanceAiEventBus {
	const observe = (event: InstanceAiEvent) => {
		for (const observer of options.observers) {
			try {
				observer?.observe(event);
			} catch {
				// Observers are side channels; the event still goes out.
			}
		}
	};
	return {
		publish: (threadId, event) => {
			observe(event);
			bus.publish(threadId, options.mapEvent?.(event) ?? event);
		},
		subscribe: (threadId, handler) => bus.subscribe(threadId, handler),
	};
}
