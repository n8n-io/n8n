import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, PollerStateRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { createEmptyRunExecutionData, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { PollCursorService } from '@/workflows/triggers/poll-cursor.service';

const nodeTypes = mockInstance(NodeTypes);

/**
 * Exercises the real commit path end to end: a real DB, a real `TransactionRunner`,
 * and real repositories, with the failure forced through a genuine rejection each side
 * already throws on its own (a caller-owned-transaction dedup key; a stale CAS version)
 * rather than through a mocked collaborator. Unit-level coverage of `PollCursorService`
 * mocks `TransactionRunner`, which proves the two writes receive the same `ctx` but
 * cannot prove either write actually rolls back the other.
 */
describe('PollCursorService atomic commit (integration)', () => {
	let pollCursorService: PollCursorService;
	let pollerStateRepository: PollerStateRepository;
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		pollCursorService = Container.get(PollCursorService);
		pollerStateRepository = Container.get(PollerStateRepository);
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'PollerState', 'WorkflowEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const node: INode = {
		id: 'node-1',
		name: 'Poll Trigger',
		type: 'poll',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	const buildWorkflow = (entity: WorkflowEntity) =>
		new Workflow({
			id: entity.id,
			name: entity.name,
			active: false,
			connections: {},
			nodeTypes,
			nodes: [node],
		});

	const buildRunData = (
		workflowData: WorkflowEntity,
		deduplicationKey?: string,
	): IWorkflowExecutionDataProcess => ({
		executionMode: 'trigger',
		executionData: createEmptyRunExecutionData(),
		workflowData,
		deduplicationKey,
	});

	it('commits the execution and the cursor advance together', async () => {
		const entity = await createWorkflow();
		const workflow = buildWorkflow(entity);
		// `advanceCursor` requires an existing row to condition its CAS on, same as the
		// real path where `readCursor` always creates one before a poll ever runs.
		await pollerStateRepository.ensureCursor(entity.id, node.id, {}, {});

		const executionId = await pollCursorService.commitPoll(workflow, node, buildRunData(entity), {
			cursor: { lastItemId: 'a' },
			version: 0,
		});

		expect(await executionRepository.findOneBy({ id: executionId })).not.toBeNull();
		expect(await pollerStateRepository.findCursor(entity.id, node.id)).toEqual({
			cursor: { lastItemId: 'a' },
			version: 1,
		});
	});

	it('rolls back the cursor advance when the execution insert fails inside the same transaction', async () => {
		const entity = await createWorkflow();
		const workflow = buildWorkflow(entity);
		await pollerStateRepository.ensureCursor(entity.id, node.id, { lastItemId: 'seed' }, {});

		// `ExecutionPersistence.create` rejects a dedup-keyed create inside a caller-owned
		// transaction on its own (see execution-persistence.ts) — a real failure inside the
		// same transaction as the cursor advance, not a mocked one.
		await expect(
			pollCursorService.commitPoll(workflow, node, buildRunData(entity, 'forced-failure-key'), {
				cursor: { lastItemId: 'unreachable' },
				version: 0,
			}),
		).rejects.toThrow();

		expect(await pollerStateRepository.findCursor(entity.id, node.id)).toEqual({
			cursor: { lastItemId: 'seed' },
			version: 0,
		});
		expect(await executionRepository.count({ where: { workflowId: entity.id } })).toBe(0);
	});

	it('rolls back the execution insert when the cursor already moved past the version read at poll start', async () => {
		const entity = await createWorkflow();
		const workflow = buildWorkflow(entity);
		await pollerStateRepository.ensureCursor(entity.id, node.id, { lastItemId: 'seed' }, {});
		// Simulate a poll that committed first and already advanced past version 0.
		await pollerStateRepository.advanceCursor(entity.id, node.id, { lastItemId: 'winner' }, 0, {});

		await expect(
			pollCursorService.commitPoll(workflow, node, buildRunData(entity), {
				cursor: { lastItemId: 'loser' },
				version: 0, // stale: the row is already at version 1
			}),
		).rejects.toThrow('Poller cursor row disappeared or was advanced by a concurrent poll');

		// The winner's cursor survives; the loser's execution never lands.
		expect(await pollerStateRepository.findCursor(entity.id, node.id)).toEqual({
			cursor: { lastItemId: 'winner' },
			version: 1,
		});
		expect(await executionRepository.count({ where: { workflowId: entity.id } })).toBe(0);
	});
});
