import { WorkflowPublicationOutboxWorkerPool } from '@/workflows/publication/workflow-publication-outbox-worker-pool';

describe('WorkflowPublicationOutboxWorkerPool', () => {
	const deferred = () => {
		let resolve!: () => void;
		const promise = new Promise<void>((r) => (resolve = r));
		return { promise, resolve };
	};

	const createPool = ({
		runPass = async () => {},
		shouldRun = () => true,
		concurrency = 2,
		onWorkerError = vi.fn(),
	}: Partial<{
		runPass: () => Promise<void>;
		shouldRun: () => boolean;
		concurrency: number;
		onWorkerError: (error: Error) => void;
	}> = {}) =>
		new WorkflowPublicationOutboxWorkerPool({ runPass, shouldRun, concurrency, onWorkerError });

	test('topUp spawns exactly `concurrency` workers', async () => {
		const runPass = vi.fn(async () => {});
		const pool = createPool({ runPass, concurrency: 3 });

		pool.topUp();
		await pool.awaitIdle();

		expect(runPass).toHaveBeenCalledTimes(3);
	});

	test('topUp is a no-op when shouldRun is false', async () => {
		const runPass = vi.fn(async () => {});
		const pool = createPool({ runPass, shouldRun: () => false });

		pool.topUp();

		await expect(pool.awaitIdle()).resolves.toBeNull();
		expect(runPass).not.toHaveBeenCalled();
	});

	test('topUp at capacity spawns no extra worker but flags a follow-up pass', async () => {
		const gate = deferred();
		const runPass = vi.fn(async () => await gate.promise);
		const pool = createPool({ runPass, concurrency: 1 });

		pool.topUp();
		pool.topUp(); // at capacity: must only flag a follow-up
		expect(runPass).toHaveBeenCalledTimes(1);

		gate.resolve();
		await pool.awaitIdle();

		expect(runPass).toHaveBeenCalledTimes(2);
	});

	test('no follow-up pass when shouldRun turns false before the worker exits', async () => {
		const gate = deferred();
		let running = true;
		const runPass = vi.fn(async () => await gate.promise);
		const pool = createPool({ runPass, shouldRun: () => running, concurrency: 1 });

		pool.topUp();
		pool.topUp();
		running = false;
		gate.resolve();
		await pool.awaitIdle();

		expect(runPass).toHaveBeenCalledTimes(1);
	});

	test('awaitIdle resolves null when every pass completes', async () => {
		const pool = createPool();

		pool.topUp();

		await expect(pool.awaitIdle()).resolves.toBeNull();
	});

	test('a failed pass never rejects: its error is handed to onWorkerError once and returned by awaitIdle', async () => {
		const error = new Error('pass failed');
		const onWorkerError = vi.fn();
		const pool = createPool({
			runPass: async () => await Promise.reject(error),
			concurrency: 1,
			onWorkerError,
		});

		pool.topUp();

		await expect(pool.awaitIdle()).resolves.toBe(error);
		expect(onWorkerError).toHaveBeenCalledTimes(1);
		expect(onWorkerError).toHaveBeenCalledWith(error);
	});

	test('one failed pass does not affect the other workers', async () => {
		const gate = deferred();
		const onWorkerError = vi.fn();
		let calls = 0;
		const runPass = vi.fn(async () => {
			if (++calls === 1) throw new Error('first pass failed');
			await gate.promise;
		});
		const pool = createPool({ runPass, concurrency: 2, onWorkerError });

		pool.topUp();
		gate.resolve();
		const error = await pool.awaitIdle();

		expect(error?.message).toBe('first pass failed');
		expect(runPass).toHaveBeenCalledTimes(2);
		expect(onWorkerError).toHaveBeenCalledTimes(1);
	});

	test('awaitIdle waits for a follow-up pass spawned after it started observing', async () => {
		const gate = deferred();
		let calls = 0;
		const runPass = vi.fn(async () => {
			if (++calls === 1) await gate.promise;
		});
		const pool = createPool({ runPass, concurrency: 1 });

		pool.topUp();
		const idle = pool.awaitIdle();
		pool.topUp(); // flags the follow-up while the first worker is busy
		gate.resolve();
		await idle;

		expect(runPass).toHaveBeenCalledTimes(2);
	});
});
