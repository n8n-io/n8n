import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiEventBus } from '@n8n/instance-ai';

import { createRunEventBus } from '../run-event-bus';

const event: InstanceAiEvent = {
	type: 'tool-result',
	runId: 'run-1',
	agentId: 'agent-1',
	payload: { toolCallId: 'tc-1', result: { success: true } },
};

function makeBus() {
	const published: InstanceAiEvent[] = [];
	const bus: InstanceAiEventBus = {
		publish: (_threadId, published_) => published.push(published_),
		subscribe: vi.fn(() => () => {}),
	};
	return { bus, published };
}

describe('createRunEventBus', () => {
	it('shows every published event to each observer before it reaches the bus', () => {
		const { bus, published } = makeBus();
		const first = { observe: vi.fn() };
		const second = { observe: vi.fn() };

		createRunEventBus(bus, { observers: [first, undefined, second] }).publish('thread-1', event);

		expect(first.observe).toHaveBeenCalledWith(event);
		expect(second.observe).toHaveBeenCalledWith(event);
		expect(published).toEqual([event]);
	});

	it('publishes the display form of an event while observers see the original', () => {
		const { bus, published } = makeBus();
		const observer = { observe: vi.fn() };
		const displayed: InstanceAiEvent = { ...event, agentId: 'displayed' };

		createRunEventBus(bus, { observers: [observer], mapEvent: () => displayed }).publish(
			'thread-1',
			event,
		);

		expect(observer.observe).toHaveBeenCalledWith(event);
		expect(published).toEqual([displayed]);
	});

	it('still publishes when an observer throws', () => {
		const { bus, published } = makeBus();
		const failing = {
			observe: vi.fn(() => {
				throw new Error('boom');
			}),
		};

		createRunEventBus(bus, { observers: [failing] }).publish('thread-1', event);

		expect(published).toEqual([event]);
	});

	it('subscribes through the underlying bus', () => {
		const { bus } = makeBus();
		const handler = vi.fn();

		createRunEventBus(bus, { observers: [] }).subscribe('thread-1', handler);

		expect(bus.subscribe).toHaveBeenCalledWith('thread-1', handler);
	});
});
