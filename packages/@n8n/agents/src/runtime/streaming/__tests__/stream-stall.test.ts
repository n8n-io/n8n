import {
	ModelStreamStallError,
	raceWithStallDeadline,
	withChunkIdleTimeout,
} from '../stream-stall';

describe('withChunkIdleTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('passes chunks through and completes with the source', async () => {
		async function* source() {
			yield await Promise.resolve(1);
			yield 2;
			yield 3;
		}
		const seen: number[] = [];

		for await (const chunk of withChunkIdleTimeout(
			source(),
			() => 60_000,
			() => {},
		)) {
			seen.push(chunk);
		}

		expect(seen).toEqual([1, 2, 3]);
	});

	it('accepts sync iterables, mirroring for-await semantics', async () => {
		function* source() {
			yield 'a';
			yield 'b';
		}
		const seen: string[] = [];

		for await (const chunk of withChunkIdleTimeout(
			source(),
			() => 60_000,
			() => {},
		)) {
			seen.push(chunk);
		}

		expect(seen).toEqual(['a', 'b']);
	});

	it('fails with a stall error and aborts the source when a chunk never arrives', async () => {
		const onStall = vi.fn();
		const gate = new Promise<number>(() => {});
		async function* source() {
			yield 1;
			yield await gate;
		}
		const iterator = withChunkIdleTimeout(source(), () => 60_000, onStall);

		await expect(iterator.next()).resolves.toEqual({ done: false, value: 1 });

		// Capture the outcome with a synchronously attached handler so the
		// rejection is never unhandled while the fake timers advance.
		const stalled = iterator.next().then(
			() => undefined,
			(error: unknown) => error,
		);
		await vi.advanceTimersByTimeAsync(59_999);
		expect(onStall).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);

		await expect(stalled).resolves.toBeInstanceOf(ModelStreamStallError);
		expect(onStall).toHaveBeenCalledTimes(1);
	});

	it('resets the idle window on every chunk', async () => {
		let release!: (value: number) => void;
		async function* source() {
			yield 1;
			yield await new Promise<number>((resolve) => {
				release = resolve;
			});
			yield 3;
		}
		const iterator = withChunkIdleTimeout(
			source(),
			() => 60_000,
			() => {},
		);

		await expect(iterator.next()).resolves.toEqual({ done: false, value: 1 });

		const pending = iterator.next();
		// Just under the deadline the read is still allowed to settle…
		await vi.advanceTimersByTimeAsync(59_000);
		release(2);
		await expect(pending).resolves.toEqual({ done: false, value: 2 });

		// …and the next read gets a fresh window rather than the stale timer.
		const after = iterator.next();
		await vi.advanceTimersByTimeAsync(59_000);
		await expect(after).resolves.toEqual({ done: false, value: 3 });
	});

	it('propagates source errors unchanged', async () => {
		async function* source(): AsyncGenerator<number> {
			yield await Promise.resolve(1);
			throw new Error('provider exploded');
		}
		const iterator = withChunkIdleTimeout(
			source(),
			() => 60_000,
			() => {},
		);

		await expect(iterator.next()).resolves.toEqual({ done: false, value: 1 });
		await expect(iterator.next()).rejects.toThrow('provider exploded');
	});
});

describe('raceWithStallDeadline', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('resolves with the promise when it settles in time', async () => {
		await expect(raceWithStallDeadline(Promise.resolve('ok'), 60_000)).resolves.toBe('ok');
	});

	it('rejects with a stall error and notifies when the promise never settles', async () => {
		const onStall = vi.fn();
		// Capture the outcome with a synchronously attached handler so the
		// rejection is never unhandled while the fake timers advance.
		const settled = raceWithStallDeadline(new Promise<never>(() => {}), 60_000, onStall).then(
			() => undefined,
			(error: unknown) => error,
		);

		await vi.advanceTimersByTimeAsync(60_000);

		await expect(settled).resolves.toBeInstanceOf(ModelStreamStallError);
		expect(onStall).toHaveBeenCalledTimes(1);
	});
});
