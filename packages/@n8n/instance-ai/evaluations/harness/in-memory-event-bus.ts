import type { InstanceAiEvent } from '@n8n/api-types';

import type { InstanceAiEventBus, StoredEvent } from '../../src/event-bus';

export function createInMemoryEventBus(): InstanceAiEventBus {
	const storeByThread = new Map<string, StoredEvent[]>();
	const subscribersByThread = new Map<string, Array<(event: StoredEvent) => void>>();

	return {
		publish(threadId, event) {
			const list = storeByThread.get(threadId) ?? [];
			const stored: StoredEvent = { id: list.length + 1, event };
			list.push(stored);
			storeByThread.set(threadId, list);
			const subscribers = subscribersByThread.get(threadId);
			if (subscribers) for (const subscriber of subscribers) subscriber(stored);
		},
		subscribe(threadId, handler) {
			const subscribers = subscribersByThread.get(threadId) ?? [];
			subscribers.push(handler);
			subscribersByThread.set(threadId, subscribers);
			return () => {
				const current = subscribersByThread.get(threadId) ?? [];
				subscribersByThread.set(
					threadId,
					current.filter((subscriber) => subscriber !== handler),
				);
			};
		},
		getEventsAfter(threadId, afterId) {
			return (storeByThread.get(threadId) ?? []).filter((event) => event.id > afterId);
		},
		getEventsForRun(threadId, runId) {
			return (storeByThread.get(threadId) ?? [])
				.map((event) => event.event)
				.filter((event) => 'runId' in event && event.runId === runId);
		},
		getEventsForRuns(threadId, runIds) {
			const runIdSet = new Set(runIds);
			return (storeByThread.get(threadId) ?? [])
				.map((event) => event.event)
				.filter((event) => 'runId' in event && runIdSet.has(event.runId));
		},
		async getNextEventId(threadId) {
			return await Promise.resolve((storeByThread.get(threadId) ?? []).length + 1);
		},
	};
}

export function wrapEventBusWithObserver(
	bus: InstanceAiEventBus,
	observe: (event: InstanceAiEvent) => void,
): InstanceAiEventBus {
	return {
		...bus,
		publish(threadId, event) {
			observe(event);
			bus.publish(threadId, event);
		},
	};
}
