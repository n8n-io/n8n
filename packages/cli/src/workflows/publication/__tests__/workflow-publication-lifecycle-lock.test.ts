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

		describe('with an abort signal', () => {
			test('rejects with the abort reason when aborted while waiting, without running the function', async () => {
				const lock = new WorkflowPublicationLifecycleLock();
				const reason = new Error('deadline');
				const controller = new AbortController();
				let ran = false;

				// Hold wf-1 indefinitely, then queue an abortable waiter behind it.
				void lock.runExclusive('wf-1', async () => await new Promise<void>(() => {}));
				const waiting = lock.runExclusive(
					'wf-1',
					async () => {
						ran = true;
					},
					controller.signal,
				);
				await flushMacrotasks();

				controller.abort(reason);

				await expect(waiting).rejects.toBe(reason);
				expect(ran).toBe(false);
			});

			test('rejects immediately when the signal is already aborted', async () => {
				const lock = new WorkflowPublicationLifecycleLock();
				const reason = new Error('deadline');
				const controller = new AbortController();
				controller.abort(reason);

				await expect(
					lock.runExclusive('wf-1', async () => 'unreachable', controller.signal),
				).rejects.toBe(reason);
				// Nothing was acquired, so nothing is held.
				expect(lock.isLocked('wf-1')).toBe(false);
			});

			test('an aborted waiter is skipped over when the lock is released', async () => {
				const lock = new WorkflowPublicationLifecycleLock();
				const events: string[] = [];
				const controller = new AbortController();
				let releaseFirst!: () => void;

				const first = lock.runExclusive('wf-1', async () => {
					await new Promise<void>((resolve) => {
						releaseFirst = resolve;
					});
				});
				const aborted = lock.runExclusive(
					'wf-1',
					async () => {
						events.push('aborted-ran');
					},
					controller.signal,
				);
				const third = lock.runExclusive('wf-1', async () => {
					events.push('third-ran');
				});
				await flushMacrotasks();

				controller.abort(new Error('deadline'));
				await expect(aborted).rejects.toThrow('deadline');

				releaseFirst();
				await Promise.all([first, third]);

				expect(events).toEqual(['third-ran']);
				// The entry is dropped once released with no remaining waiters.
				expect(lock.isLocked('wf-1')).toBe(false);
			});

			test('acquiring normally with a signal that never fires leaves no dangling listener', async () => {
				const lock = new WorkflowPublicationLifecycleLock();
				const controller = new AbortController();

				await expect(lock.runExclusive('wf-1', async () => 'ok', controller.signal)).resolves.toBe(
					'ok',
				);
				// Aborting after the fact must be a no-op.
				controller.abort(new Error('late'));
				await expect(lock.runExclusive('wf-1', async () => 'still ok')).resolves.toBe('still ok');
			});
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
});
