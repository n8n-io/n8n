import { randomUUID } from 'node:crypto';

import type { SerializableAgentState } from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { type Project, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { InstanceAiCheckpoint } from '../../entities/instance-ai-checkpoint.entity';
import { InstanceAiCheckpointRepository } from '../instance-ai-checkpoint.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

function makeState(toolCallId: string): SerializableAgentState {
	return {
		status: 'suspended',
		messageList: {
			messages: [],
			historyIds: [],
			inputIds: [],
			responseIds: [],
		},
		pendingToolCalls: {
			[toolCallId]: {
				toolCallId,
				toolName: 'ask-user',
				input: {},
				suspended: true,
				suspendPayload: {},
				resumeSchema: {},
				runId: 'run-1',
			},
		},
		persistence: {
			threadId: 'thread-placeholder',
			resourceId: 'user-1',
		},
	};
}

function forThread(state: SerializableAgentState, threadId: string): SerializableAgentState {
	return {
		...state,
		persistence: {
			...state.persistence,
			threadId,
			resourceId: state.persistence?.resourceId ?? 'user-1',
		},
	};
}

describe('InstanceAiCheckpointRepository', () => {
	let checkpointRepository: InstanceAiCheckpointRepository;
	let checkpointRows: Repository<InstanceAiCheckpoint>;
	let threadRepository: InstanceAiThreadRepository;
	let project: Project;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		checkpointRepository = Container.get(InstanceAiCheckpointRepository);
		checkpointRows = Container.get(DataSource).getRepository(InstanceAiCheckpoint);
		threadRepository = Container.get(InstanceAiThreadRepository);
		project = await createTeamProject();
	});

	beforeEach(async () => {
		await checkpointRows.delete({});
		await threadRepository.delete({});
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				resourceId: 'user-1',
				projectId: project.id,
				title: '',
				metadata: null,
			}),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveCheckpoint(state: SerializableAgentState) {
		await checkpointRows.save(
			checkpointRows.create(checkpointRow({ state: forThread(state, threadId) })),
		);
	}

	function checkpointRow(overrides: Partial<InstanceAiCheckpoint> = {}) {
		return {
			key: 'checkpoint:run-1',
			runId: 'run-1',
			hostRunId: 'host-run-1',
			threadId,
			resourceId: 'user-1',
			state: forThread(makeState('tool-call-a'), threadId),
			expiredAt: null,
			...overrides,
		};
	}

	it('allows only one caller to claim the same suspended snapshot', async () => {
		const state = makeState('tool-call-a');
		await saveCheckpoint(state);
		const expectedState = forThread(state, threadId);

		const outcomes = await Promise.all([
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedState, {}),
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedState, {}),
		]);

		expect(outcomes.sort()).toEqual([false, true]);
		await expect(checkpointRows.findOneByOrFail({ key: 'checkpoint:run-1' })).resolves.toEqual(
			expect.objectContaining({ state: expect.objectContaining({ status: 'running' }) }),
		);
	});

	it('does not let a delayed claim for snapshot A consume a newer suspension B', async () => {
		const stateA = makeState('tool-call-a');
		await saveCheckpoint(stateA);
		const expectedStateA = forThread(stateA, threadId);
		await expect(
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedStateA, {}),
		).resolves.toBe(true);

		const stateB = forThread(makeState('tool-call-b'), threadId);
		const row = await checkpointRows.findOneByOrFail({ key: 'checkpoint:run-1' });
		row.state = stateB;
		await checkpointRows.save(row);

		await expect(
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedStateA, {}),
		).resolves.toBe(false);
		await expect(checkpointRows.findOneByOrFail({ key: 'checkpoint:run-1' })).resolves.toEqual(
			expect.objectContaining({ state: stateB }),
		);
	});

	it('creates, loads, updates, and soft-expires checkpoints by key', async () => {
		const values = checkpointRow();
		await checkpointRepository.createCheckpoint(values, {});

		expect(await checkpointRepository.findByKey('missing', {})).toBeNull();
		const loaded = await checkpointRepository.findByKey(values.key, {});
		expect(loaded).toEqual(expect.objectContaining({ key: values.key, state: values.state }));

		const updatedState = forThread(makeState('tool-call-b'), threadId);
		loaded!.state = updatedState;
		await checkpointRepository.saveCheckpointChanges(loaded!, {});
		expect(await checkpointRows.findOneByOrFail({ key: values.key })).toEqual(
			expect.objectContaining({ state: updatedState }),
		);

		const expiredAt = new Date();
		await checkpointRepository.markExpiredByKey(values.key, expiredAt, {});
		expect(await checkpointRows.findOneByOrFail({ key: values.key })).toEqual(
			expect.objectContaining({ state: null, expiredAt }),
		);
	});

	it('finds active checkpoints by thread and resource newest first', async () => {
		const older = new Date('2026-01-01T00:00:00.000Z');
		const newer = new Date('2026-01-02T00:00:00.000Z');
		await checkpointRows.save([
			checkpointRows.create(
				checkpointRow({ key: 'cp:old', resourceId: 'res-1', createdAt: older, updatedAt: older }),
			),
			checkpointRows.create(
				checkpointRow({ key: 'cp:new', resourceId: 'res-1', createdAt: newer, updatedAt: newer }),
			),
			checkpointRows.create(
				checkpointRow({
					key: 'cp:expired',
					resourceId: 'res-1',
					state: null,
					expiredAt: newer,
					createdAt: new Date('2026-01-03T00:00:00.000Z'),
				}),
			),
		]);

		const byThread = await checkpointRepository.findActiveByThreadId(threadId, {});
		expect(byThread.map((row) => row.key)).toEqual(['cp:new', 'cp:old']);
		expect((await checkpointRepository.findActiveByResourceId('res-1', {}))?.key).toBe('cp:new');
		expect(await checkpointRepository.findActiveByResourceId('missing', {})).toBeUndefined();
	});

	it('expires stale rows and hard-deletes old tombstones with affected counts', async () => {
		const cutoff = new Date('2026-05-01T00:00:00.000Z');
		const stale = new Date('2026-04-01T00:00:00.000Z');
		const fresh = new Date('2026-06-01T00:00:00.000Z');
		await checkpointRows.save([
			checkpointRows.create(checkpointRow({ key: 'cp:stale', createdAt: stale, updatedAt: stale })),
			checkpointRows.create(checkpointRow({ key: 'cp:fresh', createdAt: fresh, updatedAt: fresh })),
			checkpointRows.create(
				checkpointRow({ key: 'cp:old-tombstone', state: null, expiredAt: stale, updatedAt: stale }),
			),
			checkpointRows.create(
				checkpointRow({ key: 'cp:new-tombstone', state: null, expiredAt: fresh, updatedAt: stale }),
			),
		]);

		expect(await checkpointRepository.markExpiredOlderThan(cutoff, {})).toBe(1);
		expect(await checkpointRepository.deleteExpiredOlderThan(cutoff, {})).toBe(1);

		const remaining = await checkpointRows.find();
		expect(remaining.map((row) => row.key).sort()).toEqual([
			'cp:fresh',
			'cp:new-tombstone',
			'cp:stale',
		]);
		expect(remaining.find((row) => row.key === 'cp:stale')?.expiredAt).toBeInstanceOf(Date);
	});

	it('routes operations through the supplied transaction and rolls back on failure', async () => {
		const state = forThread(makeState('tool-call-a'), threadId);
		const values = checkpointRow({ key: 'cp:tx', resourceId: 'res-tx', state });
		const failure = new Error('Roll back checkpoint writes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await checkpointRepository.createCheckpoint(values, ctx);
				expect(await checkpointRepository.findByKey('cp:tx', ctx)).not.toBeNull();
				expect(await checkpointRepository.findActiveByThreadId(threadId, ctx)).toHaveLength(1);
				expect(await checkpointRepository.findActiveByResourceId('res-tx', ctx)).toBeDefined();
				expect(await checkpointRepository.claimSuspendedForResume('cp:tx', state, ctx)).toBe(true);

				const claimed = await checkpointRepository.findByKey('cp:tx', ctx);
				expect(claimed?.state?.status).toBe('running');
				claimed!.hostRunId = 'host-tx';
				await checkpointRepository.saveCheckpointChanges(claimed!, ctx);
				await checkpointRepository.markExpiredByKey(
					'cp:tx',
					new Date('2026-01-01T00:00:00.000Z'),
					ctx,
				);
				expect(
					await checkpointRepository.deleteExpiredOlderThan(
						new Date('2026-02-01T00:00:00.000Z'),
						ctx,
					),
				).toBe(1);
				expect(await checkpointRepository.findByKey('cp:tx', ctx)).toBeNull();
				throw failure;
			}),
		).rejects.toBe(failure);

		expect(await checkpointRows.count()).toBe(0);
	});
});
