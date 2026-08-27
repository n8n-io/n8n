import {
	createWorkflow,
	createWorkflowWithHistory,
	setActiveVersion,
	testDb,
} from '@n8n/backend-test-utils';
import {
	type PollerCursor,
	PollerStateRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	TransactionRunner,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

describe('PollerStateRepository', () => {
	let repository: PollerStateRepository;
	let workflowRepository: WorkflowRepository;
	let txRunner: TransactionRunner;
	let workflowId: string;
	let otherWorkflowId: string;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(PollerStateRepository);
		workflowRepository = Container.get(WorkflowRepository);
		({ id: workflowId } = await createWorkflow());
		({ id: otherWorkflowId } = await createWorkflow());
		txRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const seed = async (nodeId: string, cursor: PollerCursor, ofWorkflow = workflowId) =>
		// TypeORM's insert type deep-partialises the JSON column into a shape a plain
		// `Record<string, unknown>` cannot satisfy.
		await repository.insert({
			workflowId: ofWorkflow,
			nodeId,
			cursor: cursor as Record<string, object>,
		});

	const readRow = async (nodeId: string) =>
		await repository.findOneOrFail({ where: { workflowId, nodeId } });

	const BACKOFF_MS = 30 * 60_000;
	const ONE_HOUR_MS = 60 * 60_000;
	// The deadline is set from the database clock, so assert a window around it
	// rather than an instant. Wide enough for a container clock, narrow enough to
	// catch a timezone misparse of the stored value.
	const CLOCK_TOLERANCE_MS = 5_000;

	const expectDeadlineNear = (backoffUntil: Date | null, sentAtMs: number, delayMs: number) => {
		expect(backoffUntil).toBeInstanceOf(Date);
		const untilMs = (backoffUntil as Date).getTime();
		expect(untilMs).toBeGreaterThanOrEqual(sentAtMs + delayMs - CLOCK_TOLERANCE_MS);
		expect(untilMs).toBeLessThanOrEqual(Date.now() + delayMs + CLOCK_TOLERANCE_MS);
	};

	describe('findCursor', () => {
		it('returns null for a node that has never polled', async () => {
			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});

		it('distinguishes an empty cursor from a missing one', async () => {
			await seed('node-1', {});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({});
		});

		// The cursor column is `json` on Postgres but `text` on SQLite, so the two
		// dialects reach the same value by different routes.
		it('returns a stored cursor unchanged', async () => {
			const cursor = {
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
				possibleDuplicates: ['id-1', 'id-2'],
			};
			await seed('node-1', cursor);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual(cursor);
		});
	});

	describe('table constraints', () => {
		it('keeps the cursors of two nodes in the same workflow separate', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
			expect(await repository.findCursor(workflowId, 'node-2')).toEqual({ lastItemId: 'b' });
		});

		it('keeps the cursors of one node id in two workflows separate', async () => {
			const { id: otherWorkflowId } = await createWorkflow();
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-1', { lastItemId: 'b' }, otherWorkflowId);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
			expect(await repository.findCursor(otherWorkflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('rejects a second row for the same workflow and node', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await expect(seed('node-1', { lastItemId: 'b' })).rejects.toThrow();
			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});

		it('rejects a cursor for a workflow that does not exist', async () => {
			await expect(seed('node-1', { lastItemId: 'a' }, 'does-not-exist')).rejects.toThrow();
			expect(await repository.findCursor('does-not-exist', 'node-1')).toBeNull();
		});

		it("drops a workflow's cursors when the workflow is deleted", async () => {
			const { id: doomedWorkflowId } = await createWorkflow();
			await seed('node-1', { lastItemId: 'a' }, doomedWorkflowId);
			await seed('node-2', { lastItemId: 'b' }, doomedWorkflowId);

			await workflowRepository.delete({ id: doomedWorkflowId });

			expect(await repository.findCursor(doomedWorkflowId, 'node-1')).toBeNull();
			expect(await repository.findCursor(doomedWorkflowId, 'node-2')).toBeNull();
		});
	});

	describe('deleteWorkflowCursors', () => {
		it('deletes all rows of the given workflows and reports how many', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });
			await seed('node-1', { lastItemId: 'c' }, otherWorkflowId);

			expect(await repository.deleteWorkflowCursors([workflowId])).toBe(2);

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
			expect(await repository.findCursor(workflowId, 'node-2')).toBeNull();
			expect(await repository.findCursor(otherWorkflowId, 'node-1')).toEqual({ lastItemId: 'c' });
		});

		it('deletes nothing and reports zero rows for an empty workflow list', async () => {
			await seed('node-1', { lastItemId: 'a' });

			expect(await repository.deleteWorkflowCursors([])).toBe(0);
			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});
	});

	describe('getOrCreateCursor', () => {
		it('creates the row with the given cursor and returns it', async () => {
			const cursor = await repository.getOrCreateCursor(
				workflowId,
				'node-1',
				{ lastTimeChecked: '2026-07-28' },
				{},
			);

			expect(cursor).toEqual({ lastTimeChecked: '2026-07-28' });
		});

		it('returns the stored cursor rather than the starting value when a row exists', async () => {
			await repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'first' }, {});

			const cursor = await repository.getOrCreateCursor(
				workflowId,
				'node-1',
				{ lastItemId: 'second' },
				{},
			);

			expect(cursor).toEqual({ lastItemId: 'first' });
		});

		it('returns one shared cursor when two callers race to create the row', async () => {
			const [first, second] = await Promise.all([
				repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'a' }, {}),
				repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'b' }, {}),
			]);

			expect([{ lastItemId: 'a' }, { lastItemId: 'b' }]).toContainEqual(first);
			expect(second).toEqual(first);
		});

		it('discards the new row when the surrounding transaction rolls back', async () => {
			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'a' }, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});
	});

	describe('advanceCursor', () => {
		it('replaces the cursor', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, {});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('moves updatedAt forward', async () => {
			await seed('node-1', { lastItemId: 'a' });
			// Backdated because the column's precision is coarser than the gap between
			// two statements issued back to back.
			const backdated = new Date(Date.now() - 60_000);
			await repository.update({ workflowId, nodeId: 'node-1' }, { updatedAt: backdated });

			await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, {});

			const { updatedAt } = await readRow('node-1');
			expect(updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
		});

		it('throws when the node has no cursor row', async () => {
			await expect(
				repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'a' }, {}),
			).rejects.toThrow('Poller cursor row disappeared');
		});

		it('commits the new cursor with the surrounding transaction', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await txRunner.run({}, async (ctx) => {
				await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, ctx);
			});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('discards the advance when the surrounding transaction rolls back', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});

		// Deactivation deprovisions the node's scheduled jobs; the running task row
		// must cascade away with its job so the lease fence rejects any commit a
		// still-running poll attempts afterwards (e.g. a mid-poll emit).
		describe('fence after the job was deprovisioned', () => {
			let jobRepository: ScheduledJobRepository;
			let taskRepository: ScheduledTaskRepository;

			beforeAll(() => {
				jobRepository = Container.get(ScheduledJobRepository);
				taskRepository = Container.get(ScheduledTaskRepository);
			});

			beforeEach(async () => {
				await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
			});

			it('rejects the advance once deprovisioning cascaded the running task away', async () => {
				// scheduled_job.workflowId FKs to workflow_published_version, which itself
				// FKs to workflow_history, so a job insert needs all three rows in place.
				const published = await createWorkflowWithHistory({});
				await setActiveVersion(published.id, published.versionId);
				await Container.get(WorkflowPublishedVersionRepository).setPublishedVersion(
					published.id,
					published.versionId,
				);

				const job = await jobRepository.save(
					jobRepository.create({
						name: 'poll-node-1',
						workflowId: published.id,
						nodeId: 'node-1',
						taskType: 'pollTrigger',
						payload: {},
						kind: 'interval',
						intervalSeconds: 60,
						enabled: true,
						nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
						maxAttempts: 1,
					}),
				);
				const task = await taskRepository.save(
					taskRepository.create({
						jobId: job.id,
						taskType: 'pollTrigger',
						payload: {},
						scheduledFor: new Date('2026-06-01T00:00:00.000Z'),
						runAt: new Date('2026-06-01T00:00:00.000Z'),
						status: 'running',
						attempts: 1,
						maxAttempts: 1,
						leaseEpoch: 1,
						leaseExpiresAt: new Date(Date.now() + 60_000),
					}),
				);
				const fence = { taskId: task.id, leaseEpoch: 1 };
				await seed('node-1', { lastItemId: 'a' }, published.id);

				// While the poll holds its lease, the fenced advance lands.
				await expect(
					repository.advanceCursor(published.id, 'node-1', { lastItemId: 'b' }, {}, fence),
				).resolves.toBe(true);

				// The same call deactivation's deprovision makes.
				await jobRepository.deleteByWorkflowNode(jobRepository.manager, published.id, 'node-1');

				// The running task row is gone with its job, not orphaned.
				await expect(taskRepository.findOneBy({ id: task.id })).resolves.toBeNull();

				// A late commit from the still-running poll is fenced out, cursor untouched.
				await expect(
					repository.advanceCursor(published.id, 'node-1', { lastItemId: 'c' }, {}, fence),
				).resolves.toBe(false);
				expect(await repository.findCursor(published.id, 'node-1')).toEqual({ lastItemId: 'b' });
			});
		});

		it('does not touch the stored failure counters', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);
			const before = await repository.findState(workflowId, 'node-1');

			await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, {});

			const after = await repository.findState(workflowId, 'node-1');
			expect(after?.backoffUntil).toEqual(before?.backoffUntil);
			expect(after?.consecutiveErrors).toEqual(before?.consecutiveErrors);
		});
	});

	describe('findState', () => {
		it('returns null for a node that has never polled', async () => {
			expect(await repository.findState(workflowId, 'node-1')).toBeNull();
		});

		it('returns the cursor and clean failure fields for a healthy row', async () => {
			await seed('node-1', { lastItemId: 'a' });

			expect(await repository.findState(workflowId, 'node-1')).toEqual({
				cursor: { lastItemId: 'a' },
				consecutiveErrors: 0,
				backoffUntil: null,
			});
		});

		it('distinguishes an empty cursor from a missing row', async () => {
			await seed('node-1', {});

			const state = await repository.findState(workflowId, 'node-1');

			expect(state).not.toBeNull();
			expect(state?.cursor).toEqual({});
		});

		it('returns the stored failure counters alongside the cursor', async () => {
			await seed('node-1', { lastItemId: 'a' });
			const sentAt = Date.now();
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			const state = await repository.findState(workflowId, 'node-1');

			expect(state?.cursor).toEqual({ lastItemId: 'a' });
			expect(state?.consecutiveErrors).toBe(1);
			expectDeadlineNear(state?.backoffUntil ?? null, sentAt, BACKOFF_MS);
		});
	});

	describe('recordFailure', () => {
		it('increments the failure counter in SQL rather than reading then writing', async () => {
			await seed('node-1', {});

			await Promise.all([
				repository.recordFailure(workflowId, 'node-1', BACKOFF_MS),
				repository.recordFailure(workflowId, 'node-1', BACKOFF_MS),
			]);

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(2);
		});

		it('sets the deadline on a row that carries none', async () => {
			await seed('node-1', {});
			const sentAt = Date.now();

			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(1);
			expectDeadlineNear(state?.backoffUntil ?? null, sentAt, BACKOFF_MS);
		});

		it('moves updatedAt forward', async () => {
			await seed('node-1', {});
			const backdated = new Date(Date.now() - 60_000);
			await repository.update({ workflowId, nodeId: 'node-1' }, { updatedAt: backdated });

			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			const { updatedAt } = await readRow('node-1');
			expect(updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
		});

		it('does not touch the stored cursor', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});

		it('accumulates the counter across sequential calls', async () => {
			await seed('node-1', {});

			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(2);
		});

		it('keeps a standing deadline that reaches further out than the new one', async () => {
			await seed('node-1', {});
			const sentAt = Date.now();
			await repository.recordFailure(workflowId, 'node-1', ONE_HOUR_MS);

			await repository.recordFailure(workflowId, 'node-1', 5_000);

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(2);
			expectDeadlineNear(state?.backoffUntil ?? null, sentAt, ONE_HOUR_MS);
		});

		it('pushes the deadline out when the new one reaches further', async () => {
			await seed('node-1', {});
			await repository.recordFailure(workflowId, 'node-1', 5_000);

			const sentAt = Date.now();
			await repository.recordFailure(workflowId, 'node-1', ONE_HOUR_MS);

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(2);
			expectDeadlineNear(state?.backoffUntil ?? null, sentAt, ONE_HOUR_MS);
		});

		it('returns false without throwing for a node with no stored row', async () => {
			await expect(repository.recordFailure(workflowId, 'node-1', BACKOFF_MS)).resolves.toBe(false);
		});

		it('commits with the surrounding transaction', async () => {
			await seed('node-1', {});

			await txRunner.run({}, async (ctx) => {
				await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS, ctx);
			});

			const state = await repository.findState(workflowId, 'node-1');
			expect(state?.consecutiveErrors).toBe(1);
		});

		it('discards the increment when the surrounding transaction rolls back', async () => {
			await seed('node-1', {});

			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findState(workflowId, 'node-1')).toEqual({
				consecutiveErrors: 0,
				backoffUntil: null,
				cursor: {},
			});
		});
	});

	describe('clearFailures', () => {
		it('zeroes the counter and clears the deadline', async () => {
			await seed('node-1', {});
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			await repository.clearFailures(workflowId, 'node-1');

			expect(await repository.findState(workflowId, 'node-1')).toEqual({
				consecutiveErrors: 0,
				backoffUntil: null,
				cursor: {},
			});
		});

		it('does not touch the stored cursor', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);

			await repository.clearFailures(workflowId, 'node-1');

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});

		it('returns false without throwing for a node with no stored row', async () => {
			await expect(repository.clearFailures(workflowId, 'node-1')).resolves.toBe(false);
		});

		it('leaves a row that carries no failures untouched', async () => {
			await seed('node-1', {});
			const { updatedAt: before } = await readRow('node-1');

			await expect(repository.clearFailures(workflowId, 'node-1')).resolves.toBe(false);

			const { updatedAt: after } = await readRow('node-1');
			expect(after.getTime()).toBe(before.getTime());
		});

		it('moves updatedAt forward', async () => {
			await seed('node-1', {});
			await repository.recordFailure(workflowId, 'node-1', BACKOFF_MS);
			const backdated = new Date(Date.now() - 60_000);
			await repository.update({ workflowId, nodeId: 'node-1' }, { updatedAt: backdated });

			await repository.clearFailures(workflowId, 'node-1');

			const { updatedAt } = await readRow('node-1');
			expect(updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
		});
	});
});
