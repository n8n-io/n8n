import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { EventRelay, EventService } from '../../index';

declare module '../../index' {
	interface EventMap {
		'relay-test-event': { id: string };
		'relay-optional-event': { id: string };
	}
}

class TestEventRelay extends EventRelay {
	init(handlers: {
		'relay-test-event'?: (event: { id: string }) => void | Promise<void>;
		'relay-optional-event'?: (event: { id: string }) => void | Promise<void>;
	}) {
		this.setupListeners(handlers);
	}
}

describe('EventRelay', () => {
	afterEach(() => {
		Container.reset();
	});

	it('catches and logs async listener rejections without emitting unhandledRejection', async () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const events = new EventService();
		const relay = new TestEventRelay(events);
		const failure = new Error('database unavailable');
		const secondListener = vi.fn();

		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);

		try {
			relay.init({
				'relay-test-event': async () => {
					await Promise.reject(failure);
				},
			});
			events.on('relay-test-event', secondListener);

			events.emit('relay-test-event', { id: 'evt-1' });
			await new Promise((resolve) => setImmediate(resolve));

			expect(unhandled).not.toHaveBeenCalled();
			expect(secondListener).toHaveBeenCalledExactlyOnceWith({ id: 'evt-1' });
			expect(logger.error).toHaveBeenCalledExactlyOnceWith('Event relay listener failed', {
				eventName: 'relay-test-event',
				relay: 'TestEventRelay',
				error: failure,
			});
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});

	it('catches and logs synchronous throws and wraps non-Error values', async () => {
		const logger = mock<Logger>();
		const events = new EventService();
		const relay = new TestEventRelay(events, logger);

		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);

		try {
			relay.init({
				'relay-test-event': () => {
					// eslint-disable-next-line @typescript-eslint/only-throw-error
					throw 'unexpected string throw';
				},
				'relay-optional-event': undefined,
			});

			events.emit('relay-test-event', { id: 'evt-2' });
			events.emit('relay-optional-event', { id: 'evt-3' });
			await new Promise((resolve) => setImmediate(resolve));

			expect(unhandled).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledExactlyOnceWith('Event relay listener failed', {
				eventName: 'relay-test-event',
				relay: 'TestEventRelay',
				error: expect.objectContaining({
					cause: expect.objectContaining({ message: 'unexpected string throw' }),
				}),
			});
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});
});
