import { BackgroundTaskTracker } from '../background-task-tracker';

describe('BackgroundTaskTracker', () => {
	it('flushes a single in-flight promise', async () => {
		const tracker = new BackgroundTaskTracker();
		let resolveInner!: () => void;
		const inner = new Promise<void>((resolve) => {
			resolveInner = resolve;
		});
		tracker.track(inner);
		expect(tracker.pendingCount).toBe(1);

		const flush = tracker.flush();
		resolveInner();
		await flush;
		expect(tracker.pendingCount).toBe(0);
	});

	it('waits for all tracked promises in flush()', async () => {
		const tracker = new BackgroundTaskTracker();
		const events: string[] = [];
		const a = new Promise<void>((resolve) =>
			setTimeout(() => {
				events.push('a');
				resolve();
			}, 10),
		);
		const b = new Promise<void>((resolve) =>
			setTimeout(() => {
				events.push('b');
				resolve();
			}, 5),
		);
		tracker.track(a);
		tracker.track(b);

		await tracker.flush();
		expect(events.sort()).toEqual(['a', 'b']);
	});

	it('flush() does not throw on rejected tracked promises', async () => {
		const tracker = new BackgroundTaskTracker();
		const rejected = Promise.reject(new Error('boom'));
		// Suppress unhandled-rejection warning by attaching a no-op handler before track.
		rejected.catch(() => {});
		tracker.track(rejected);
		await expect(tracker.flush()).resolves.toBeUndefined();
	});

	it('flush() is a no-op when nothing is tracked', async () => {
		const tracker = new BackgroundTaskTracker();
		await expect(tracker.flush()).resolves.toBeUndefined();
	});

	it('removes promises from pendingCount after they settle', async () => {
		const tracker = new BackgroundTaskTracker();
		const inner = Promise.resolve();
		tracker.track(inner);
		await inner;
		// One microtask is needed for the .then cleanup to run.
		await Promise.resolve();
		expect(tracker.pendingCount).toBe(0);
	});

	it('flush() called twice in a row both resolve', async () => {
		const tracker = new BackgroundTaskTracker();
		tracker.track(Promise.resolve());
		await tracker.flush();
		await expect(tracker.flush()).resolves.toBeUndefined();
	});
});
