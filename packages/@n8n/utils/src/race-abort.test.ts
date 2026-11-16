import { raceAbort } from './race-abort';

const abortError = () => new Error('closed');

/** Counts abort listeners so a call that forgets to remove one is visible. */
const trackedSignal = () => {
	const controller = new AbortController();
	const { signal } = controller;
	let live = 0;
	const add = signal.addEventListener.bind(signal);
	const remove = signal.removeEventListener.bind(signal);
	vi.spyOn(signal, 'addEventListener').mockImplementation((...args: Parameters<typeof add>) => {
		live++;
		add(...args);
	});
	vi.spyOn(signal, 'removeEventListener').mockImplementation(
		(...args: Parameters<typeof remove>) => {
			live--;
			remove(...args);
		},
	);
	return { controller, signal, liveListeners: () => live };
};

describe('raceAbort', () => {
	it('resolves with the value when the promise wins', async () => {
		const { signal } = trackedSignal();

		await expect(raceAbort(Promise.resolve('done'), signal, abortError)).resolves.toBe('done');
	});

	it.each([
		['already aborted before the call', true],
		['aborted while waiting', false],
	])('rejects when the signal fires: %s', async (_label, abortFirst) => {
		const { controller, signal } = trackedSignal();
		if (abortFirst) controller.abort();

		const promise = raceAbort(new Promise(() => {}), signal, abortError);
		if (!abortFirst) controller.abort();

		await expect(promise).rejects.toThrow('closed');
	});

	it('rejects with the promise error when the promise rejects first', async () => {
		const { signal } = trackedSignal();

		await expect(raceAbort(Promise.reject(new Error('boom')), signal, abortError)).rejects.toThrow(
			'boom',
		);
	});

	// The leak this exists to prevent: a per-call registration that outlives the
	// call accumulates on a signal that stays live for the whole consumer.
	it('leaves no listener behind across many calls', async () => {
		const { signal, liveListeners } = trackedSignal();

		for (let i = 0; i < 100; i++) {
			await raceAbort(Promise.resolve(i), signal, abortError);
		}

		expect(liveListeners()).toBe(0);
	});

	it('leaves no listener behind when the promise rejects', async () => {
		const { signal, liveListeners } = trackedSignal();

		await expect(raceAbort(Promise.reject(new Error('boom')), signal, abortError)).rejects.toThrow(
			'boom',
		);

		expect(liveListeners()).toBe(0);
	});

	it('does not raise an unhandled rejection when the signal fires after the promise won', async () => {
		const { controller, signal } = trackedSignal();
		const unhandled = vi.fn();
		process.on('unhandledRejection', unhandled);

		try {
			await raceAbort(Promise.resolve('done'), signal, abortError);
			controller.abort();
			await new Promise((resolve) => setImmediate(resolve));

			expect(unhandled).not.toHaveBeenCalled();
		} finally {
			process.off('unhandledRejection', unhandled);
		}
	});
});
