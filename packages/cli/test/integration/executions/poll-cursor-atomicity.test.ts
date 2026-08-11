import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { PollerConfig } from '@n8n/config';
import type { CreateExecutionPayload, WorkflowEntity } from '@n8n/db';
import {
	ExecutionEntity,
	ExecutionRepository,
	PollerStateRepository,
	TransactionRunner,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';

describe('poll cursor atomicity', () => {
	const nodeId = 'node-1';

	let pollCursorService: PollCursorService;
	let executionPersistence: ExecutionPersistence;
	let executionRepository: ExecutionRepository;
	let pollerStateRepository: PollerStateRepository;
	let transactionRunner: TransactionRunner;
	let pollerConfig: PollerConfig;
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		pollCursorService = Container.get(PollCursorService);
		executionPersistence = Container.get(ExecutionPersistence);
		executionRepository = Container.get(ExecutionRepository);
		pollerStateRepository = Container.get(PollerStateRepository);
		transactionRunner = Container.get(TransactionRunner);
		pollerConfig = Container.get(PollerConfig);
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState', 'ExecutionEntity', 'WorkflowEntity']);
		workflow = await createWorkflow();
		// Atomicity is flag-gated; enable it for these tests.
		pollerConfig.durableCursorsEnabled = true;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const buildPayload = (deduplicationKey?: string): CreateExecutionPayload => ({
		data: createEmptyRunExecutionData(),
		workflowData: workflow,
		mode: 'trigger',
		finished: false,
		status: 'new',
		workflowId: workflow.id,
		deduplicationKey,
	});

	const buildExecutionEntity = (): Partial<ExecutionEntity> => ({
		finished: false,
		mode: 'trigger',
		status: 'new',
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: new Date(),
		workflowId: workflow.id,
	});

	it('commits the cursor advance and the execution row together', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		const { executionId } = await pollCursorService.commitWithExecution({
			workflowId: workflow.id,
			nodeId,
			cursor: { lastItemId: 'b' },
			payload: buildPayload(),
		});

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.findOneBy({ id: executionId })).toMatchObject({
			status: 'new',
			workflowId: workflow.id,
		});
	});

	it('leaves the cursor unadvanced and writes no execution when the insert fails', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		const key = 'wf:node-1:t1';
		// A dispatched execution already holds this key, so the insert violates the
		// unique index from inside the transaction.
		const existingId = await executionPersistence.create({
			...buildPayload(key),
			status: 'running',
		});

		await expect(
			pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(key),
			}),
		).rejects.toThrow();

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'a',
		});
		const executions = await executionRepository.find({ select: ['id'] });
		expect(executions.map((e) => e.id)).toEqual([existingId]);
	});

	it('persists a standalone cursor advance with no execution row', async () => {
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });

		await pollCursorService.commitCursorOnly({
			workflowId: workflow.id,
			nodeId,
			cursor: { lastItemId: 'b' },
		});

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.find({ select: ['id'] })).toEqual([]);
	});

	it('seeds the cursor from the given blob on the first read and keeps it afterwards', async () => {
		const seeded = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'from-static-data',
		});

		expect(seeded).toEqual({ migrated: true, cursor: { lastItemId: 'from-static-data' } });
		expect(
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'ignored' }),
		).toEqual({ migrated: true, cursor: { lastItemId: 'from-static-data' } });
	});

	it('does not create a row for a node that has never migrated when the flag is off', async () => {
		pollerConfig.durableCursorsEnabled = false;

		const resolved = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'from-static-data',
		});

		expect(resolved).toEqual({ migrated: false });
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toBeNull();
	});

	it('seeds the row from the static-data cursor already accrued while the flag was off, rather than resetting it', async () => {
		pollerConfig.durableCursorsEnabled = false;

		// Simulate several polls accruing a cursor in the node's static data while
		// durable cursors are off: resolveCursor reports `migrated: false` and never
		// touches poller_state, mirroring the unmigrated path e2e-tested in
		// poll-trigger-cursor-unmigrated.spec.ts.
		for (const lastItemId of ['a', 'b', 'c']) {
			expect(await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId })).toEqual({
				migrated: false,
			});
		}
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toBeNull();

		// Flip the flag on for this already-running workflow and poll again, passing
		// through the cursor its static data accrued while the flag was off.
		pollerConfig.durableCursorsEnabled = true;
		const migrated = await pollCursorService.resolveCursor(workflow.id, nodeId, {
			lastItemId: 'c',
		});

		// The row resumes forward from the accrued value - it is not seeded null, which
		// would otherwise re-emit every item the workflow already saw as unmigrated.
		expect(migrated).toEqual({ migrated: true, cursor: { lastItemId: 'c' } });
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'c',
		});

		// Once migrated, the row is the source of truth: a later poll's static-data
		// blob no longer has any effect, even if it disagrees with the stored cursor.
		expect(
			await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'stale' }),
		).toEqual({ migrated: true, cursor: { lastItemId: 'c' } });
	});

	it('still advances the cursor when the execution insert fails and the flag is off, for a node that already migrated', async () => {
		// Migrate the row while the flag is on, then flip it off: reads still prefer
		// the row, and the flag only narrows to write atomicity from here on.
		await pollCursorService.resolveCursor(workflow.id, nodeId, { lastItemId: 'a' });
		pollerConfig.durableCursorsEnabled = false;

		const key = 'wf:node-1:t1';
		await executionPersistence.create({ ...buildPayload(key), status: 'running' });

		await expect(
			pollCursorService.commitWithExecution({
				workflowId: workflow.id,
				nodeId,
				cursor: { lastItemId: 'b' },
				payload: buildPayload(key),
			}),
		).rejects.toThrow();

		// Unlike the flag-on case above, the advance is not rolled back: with the flag
		// off the two writes are independent, reopening the old race as a known cost
		// of the kill switch rather than a fallback to static data.
		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
	});

	describe('ExecutionRepository.runInTransaction', () => {
		// The reverse of the rollback test above: there the insert fails, here the insert
		// succeeds and the caller fails afterwards, which only rolls the insert back if
		// the repository joined the caller's transaction rather than opening its own.
		it('joins the caller-supplied transaction so a later failure in the caller rolls back work already run through it', async () => {
			let executionId: string | undefined;

			await expect(
				transactionRunner.run({}, async (ctx) => {
					executionId = await executionRepository.runInTransaction(ctx, async (tx) => {
						const saved = await tx.save(ExecutionEntity, buildExecutionEntity());
						return saved.id;
					});
					throw new Error('caller fails after work already ran');
				}),
			).rejects.toThrow('caller fails after work already ran');

			expect(await executionRepository.findOneBy({ id: executionId })).toBeNull();
		});
	});
});
