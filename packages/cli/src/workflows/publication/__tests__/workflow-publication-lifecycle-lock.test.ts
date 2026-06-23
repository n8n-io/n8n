import { WorkflowPublicationLifecycleLock } from '@/workflows/publication/workflow-publication-lifecycle-lock';

const flushMacrotasks = async () => await new Promise((resolve) => setImmediate(resolve));

describe('WorkflowPublicationLifecycleLock', () => {
	describe('runExclusive', () => {
		test('returns the result of the wrapped function', async () => {
			const lock = new WorkflowPublicationLifecycleLock();

			await expect(lock.runExclusive('wf-1', async () => 42)).resolves.toBe(42);
		});

		test('serializes concurrent callers for the same workflow in FIFO order', async () => {
			const lock = new WorkflowPublicationLifecycleLock();
			const events: string[] = [];
			let releaseFirst!: () => void;

			const first = lock.runExclusive('wf-1', async () => {
				events.push('first-acquired');
				await new Promise<void>((resolve) => {
					releaseFirst = resolve;
				});
				events.push('first-released');
			});
			const second = lock.runExclusive('wf-1', async () => {
				events.push('second-acquired');
			});

			await flushMacrotasks();
			// The second caller cannot enter while the first holds the same lock.
			expect(events).toEqual(['first-acquired']);

			releaseFirst();
			await Promise.all([first, second]);

			expect(events).toEqual(['first-acquired', 'first-released', 'second-acquired']);
		});

		test('does not block callers for different workflows', async () => {
			const lock = new WorkflowPublicationLifecycleLock();
			const events: string[] = [];

			// Hold wf-1 indefinitely; wf-2 must still run.
			const held = lock.runExclusive('wf-1', async () => await new Promise<void>(() => {}));
			await lock.runExclusive('wf-2', async () => {
				events.push('wf-2-ran');
			});

			expect(events).toEqual(['wf-2-ran']);
			void held;
		});

		test('releases the lock even when the wrapped function throws', async () => {
			const lock = new WorkflowPublicationLifecycleLock();

			await expect(
				lock.runExclusive('wf-1', async () => {
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			// A subsequent caller can still acquire the same workflow's lock.
			await expect(lock.runExclusive('wf-1', async () => 'ok')).resolves.toBe('ok');
		});
	});

	describe('isLocked', () => {
		test('reports whether a workflow currently holds the lock', async () => {
			const lock = new WorkflowPublicationLifecycleLock();
			expect(lock.isLocked('wf-1')).toBe(false);

			let release!: () => void;
			const held = lock.runExclusive('wf-1', async () => {
				await new Promise<void>((resolve) => {
					release = resolve;
				});
			});
			// Let the wrapped function start so `release` is assigned.
			await flushMacrotasks();

			expect(lock.isLocked('wf-1')).toBe(true);
			expect(lock.isLocked('wf-2')).toBe(false);

			release();
			await held;

			// The entry is dropped once released with no waiters.
			expect(lock.isLocked('wf-1')).toBe(false);
		});
	});

	describe('getLockedWorkflowIds', () => {
		test('returns workflows currently holding lifecycle locks', async () => {
			const lock = new WorkflowPublicationLifecycleLock();
			let releaseFirst!: () => void;
			let releaseSecond!: () => void;

			const first = lock.runExclusive('wf-1', async () => {
				await new Promise<void>((resolve) => {
					releaseFirst = resolve;
				});
			});
			const second = lock.runExclusive('wf-2', async () => {
				await new Promise<void>((resolve) => {
					releaseSecond = resolve;
				});
			});
			await flushMacrotasks();

			expect(lock.getLockedWorkflowIds()).toEqual(['wf-1', 'wf-2']);

			releaseFirst();
			releaseSecond();
			await Promise.all([first, second]);

			expect(lock.getLockedWorkflowIds()).toEqual([]);
		});
	});

	describe('runExclusiveOrTimeout', () => {
		test('runs the function under the lock and reports no timeout when uncontended', async () => {
			const lock = new WorkflowPublicationLifecycleLock();
			let ran = false;

			const result = await lock.runExclusiveOrTimeout(
				'wf-1',
				async () => {
					ran = true;
				},
				1000,
			);

			expect(result).toEqual({ timedOut: false });
			expect(ran).toBe(true);
		});

		test('falls through and runs the function unlocked when the holder never releases', async () => {
			jest.useFakeTimers();
			try {
				const lock = new WorkflowPublicationLifecycleLock();

				// Acquire and hold wf-1 indefinitely.
				const holder = lock.runExclusive('wf-1', async () => await new Promise<void>(() => {}));

				let ran = false;
				const resultPromise = lock.runExclusiveOrTimeout(
					'wf-1',
					async () => {
						ran = true;
					},
					30_000,
				);

				jest.advanceTimersByTime(30_000);

				await expect(resultPromise).resolves.toEqual({ timedOut: true });
				expect(ran).toBe(true);

				void holder;
			} finally {
				jest.useRealTimers();
			}
		});
	});
});
