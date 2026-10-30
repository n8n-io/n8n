import {
	CLAIM_LEASE_MS,
	CloudBrowserTaskStorage,
	type CloudBrowserTaskRecord,
} from '../cloud-browser-task-storage';
import type { PatchableThreadMemory, ThreadPatch, ThreadRecord } from '../thread-patch';

const THREAD_ID = 'thread-1';

/**
 * A thread memory that keeps one thread. Like the real memory, it runs one patch at a time, and
 * each patch waits between its read and its write, so patches that were not serialized would mix.
 */
function makeMemory(metadata: Record<string, unknown> = {}) {
	let saves = 0;
	let thread: ThreadRecord = {
		id: THREAD_ID,
		resourceId: 'user-1',
		metadata,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	let queue: Promise<unknown> = Promise.resolve();
	const memory: PatchableThreadMemory = {
		getThread: async (threadId: string) => (threadId === THREAD_ID ? thread : null),
		patchThread: async ({
			threadId,
			update,
		}: {
			threadId: string;
			update: (current: ThreadRecord) => ThreadPatch | null | undefined;
		}) => {
			const run = queue.then(async () => {
				if (threadId !== THREAD_ID) return null;
				const current = { ...thread, metadata: { ...(thread.metadata ?? {}) } };
				// Stands in for the database round trip between the read and the write.
				await new Promise((resolve) => setTimeout(resolve, 0));
				const patch = update(current);
				if (!patch) return thread;
				saves++;
				thread = { ...thread, metadata: patch.metadata ?? thread.metadata };
				return thread;
			});
			queue = run.catch(() => undefined);
			return await run;
		},
	};
	return { memory, metadata: () => thread.metadata ?? {}, saves: () => saves };
}

function makeRecord(overrides: Partial<CloudBrowserTaskRecord> = {}): CloudBrowserTaskRecord {
	return {
		taskId: 'task-1',
		agentId: 'agent-1',
		runId: 'run-1',
		title: 'Find the price',
		status: 'running',
		startedAt: '2026-10-22T10:00:00.000Z',
		...overrides,
	};
}

describe('CloudBrowserTaskStorage', () => {
	it('adds a task and lists it', async () => {
		const { memory } = makeMemory();
		const storage = new CloudBrowserTaskStorage(memory);

		await storage.add(THREAD_ID, makeRecord());

		expect(await storage.list(THREAD_ID)).toEqual([makeRecord()]);
	});

	it('keeps the other metadata of the thread', async () => {
		const { memory, metadata } = makeMemory({ other: 'value' });
		const storage = new CloudBrowserTaskStorage(memory);

		await storage.add(THREAD_ID, makeRecord());

		expect(metadata()).toMatchObject({ other: 'value' });
	});

	it('removes a task', async () => {
		const { memory } = makeMemory();
		const storage = new CloudBrowserTaskStorage(memory);
		await storage.add(THREAD_ID, makeRecord());
		await storage.add(THREAD_ID, makeRecord({ taskId: 'task-2' }));

		await storage.remove(THREAD_ID, 'task-1');

		expect((await storage.list(THREAD_ID)).map((task) => task.taskId)).toEqual(['task-2']);
	});

	it('marks a task finished with its outcome and summary', async () => {
		const { memory } = makeMemory();
		const storage = new CloudBrowserTaskStorage(memory);
		await storage.add(THREAD_ID, makeRecord());

		await storage.markFinished(THREAD_ID, 'task-1', { outcome: 'succeeded', summary: '$20' });

		expect(await storage.list(THREAD_ID)).toEqual([
			{
				...makeRecord(),
				status: 'finished',
				outcome: 'succeeded',
				summary: '$20',
				finishedAt: expect.any(String),
			},
		]);
	});

	it('does not create a record when it marks an unknown task finished', async () => {
		const { memory } = makeMemory();
		const storage = new CloudBrowserTaskStorage(memory);

		await storage.markFinished(THREAD_ID, 'task-1', { outcome: 'failed', summary: 'Stopped' });

		expect(await storage.list(THREAD_ID)).toEqual([]);
	});

	describe('claimUndelivered', () => {
		/** A store with one finished task. */
		async function withFinishedTask() {
			const { memory } = makeMemory();
			const storage = new CloudBrowserTaskStorage(memory);
			await storage.add(THREAD_ID, makeRecord());
			await storage.markFinished(THREAD_ID, 'task-1', { outcome: 'succeeded', summary: '$20' });
			return storage;
		}

		const taskIds = (tasks: CloudBrowserTaskRecord[]) => tasks.map((task) => task.taskId);

		it('claims each finished task once, oldest first, and keeps it until it is delivered', async () => {
			const { memory } = makeMemory();
			const storage = new CloudBrowserTaskStorage(memory);
			await storage.add(
				THREAD_ID,
				makeRecord({ taskId: 'newer', startedAt: '2026-10-22T11:00:00.000Z' }),
			);
			await storage.add(
				THREAD_ID,
				makeRecord({ taskId: 'older', startedAt: '2026-10-22T09:00:00.000Z' }),
			);
			await storage.add(THREAD_ID, makeRecord({ taskId: 'running' }));
			await storage.markFinished(THREAD_ID, 'newer', { outcome: 'succeeded', summary: 'A' });
			await storage.markFinished(THREAD_ID, 'older', { outcome: 'blocked', summary: 'B' });

			const claimed = await storage.claimUndelivered(THREAD_ID);

			expect(taskIds(claimed)).toEqual(['older', 'newer']);
			expect(claimed.every((task) => task.claimedAt !== undefined)).toBe(true);
			expect(await storage.claimUndelivered(THREAD_ID)).toEqual([]);
			expect(taskIds(await storage.list(THREAD_ID)).sort()).toEqual(['newer', 'older', 'running']);
		});

		it('removes the claimed tasks once their delivery started', async () => {
			const storage = await withFinishedTask();
			await storage.add(THREAD_ID, makeRecord({ taskId: 'running' }));
			const claimed = await storage.claimUndelivered(THREAD_ID);

			await storage.removeDelivered(THREAD_ID, claimed);

			expect(taskIds(await storage.list(THREAD_ID))).toEqual(['running']);
		});

		it('does not write the thread when nothing is finished, or when it gets no tasks back', async () => {
			const { memory, saves } = makeMemory();
			const storage = new CloudBrowserTaskStorage(memory);
			await storage.add(THREAD_ID, makeRecord());
			const savesBefore = saves();

			expect(await storage.claimUndelivered(THREAD_ID)).toEqual([]);
			await storage.releaseClaim(THREAD_ID, []);
			await storage.removeDelivered(THREAD_ID, []);

			expect(saves()).toBe(savesBefore);
		});

		it('gives each finished task to only one of two claims that run at once', async () => {
			const { memory } = makeMemory();
			const storage = new CloudBrowserTaskStorage(memory);
			await storage.add(THREAD_ID, makeRecord());
			await storage.markFinished(THREAD_ID, 'task-1', { outcome: 'succeeded', summary: '$20' });

			const [first, second] = await Promise.all([
				storage.claimUndelivered(THREAD_ID),
				storage.claimUndelivered(THREAD_ID),
			]);

			expect([...first, ...second].map((task) => task.taskId)).toEqual(['task-1']);
		});

		it('lets the next delivery claim the tasks again after a release', async () => {
			const storage = await withFinishedTask();
			const claimed = await storage.claimUndelivered(THREAD_ID);

			await storage.releaseClaim(THREAD_ID, claimed);

			expect(taskIds(await storage.claimUndelivered(THREAD_ID))).toEqual(['task-1']);
		});

		describe('lease', () => {
			const start = new Date('2026-10-26T10:00:00.000Z');

			beforeEach(() => {
				// Only the clock: the test memory waits on a real timer between its read and its write.
				vi.useFakeTimers({ toFake: ['Date'] });
				vi.setSystemTime(start);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const at = (ms: number) => vi.setSystemTime(start.getTime() + ms);

			it('lets the next delivery claim a task once its claim is older than the lease', async () => {
				const storage = await withFinishedTask();
				await storage.claimUndelivered(THREAD_ID);

				at(CLAIM_LEASE_MS - 1);
				expect(await storage.claimUndelivered(THREAD_ID)).toEqual([]);

				at(CLAIM_LEASE_MS + 1);
				expect(taskIds(await storage.claimUndelivered(THREAD_ID))).toEqual(['task-1']);
			});

			it('leaves a task that a later claim took over', async () => {
				const storage = await withFinishedTask();
				const expired = await storage.claimUndelivered(THREAD_ID);
				at(CLAIM_LEASE_MS + 1);
				const current = await storage.claimUndelivered(THREAD_ID);

				await storage.releaseClaim(THREAD_ID, expired);
				await storage.removeDelivered(THREAD_ID, expired);

				expect(await storage.list(THREAD_ID)).toEqual(current);

				await storage.removeDelivered(THREAD_ID, current);

				expect(await storage.list(THREAD_ID)).toEqual([]);
			});
		});
	});

	it('ignores a stored record that does not match the schema', async () => {
		const { memory } = makeMemory({
			instanceAiCloudBrowserTasks: { 'task-1': makeRecord(), broken: { taskId: 'broken' } },
		});
		const storage = new CloudBrowserTaskStorage(memory);

		expect(await storage.list(THREAD_ID)).toEqual([makeRecord()]);
	});
});
