import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { CreateExecutionPayload, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, PollerStateRepository } from '@n8n/db';
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
	let workflow: WorkflowEntity;

	beforeAll(async () => {
		await testDb.init();
		pollCursorService = Container.get(PollCursorService);
		executionPersistence = Container.get(ExecutionPersistence);
		executionRepository = Container.get(ExecutionRepository);
		pollerStateRepository = Container.get(PollerStateRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState', 'ExecutionEntity', 'WorkflowEntity']);
		workflow = await createWorkflow();
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

	it('commits the cursor advance and the execution row together', async () => {
		await pollCursorService.readCursor(workflow.id, nodeId, { lastItemId: 'a' });

		const executionId = await pollCursorService.commitWithExecution({
			workflowId: workflow.id,
			nodeId,
			cursor: { lastItemId: 'b' },
			payload: buildPayload(),
		});

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.findOneBy({ id: executionId })).not.toBeNull();
	});

	it('leaves the cursor unadvanced and writes no execution when the insert fails', async () => {
		await pollCursorService.readCursor(workflow.id, nodeId, { lastItemId: 'a' });

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
		await pollCursorService.readCursor(workflow.id, nodeId, { lastItemId: 'a' });

		await pollCursorService.commitCursorOnly(workflow.id, nodeId, { lastItemId: 'b' });

		expect(await pollerStateRepository.findCursor(workflow.id, nodeId)).toEqual({
			lastItemId: 'b',
		});
		expect(await executionRepository.find({ select: ['id'] })).toEqual([]);
	});

	it('seeds the cursor from the given blob on the first read and keeps it afterwards', async () => {
		const seeded = await pollCursorService.readCursor(workflow.id, nodeId, {
			lastItemId: 'from-static-data',
		});

		expect(seeded).toEqual({ lastItemId: 'from-static-data' });
		expect(
			await pollCursorService.readCursor(workflow.id, nodeId, { lastItemId: 'ignored' }),
		).toEqual({ lastItemId: 'from-static-data' });
	});
});
