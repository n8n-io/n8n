import type { ObservationCursor, ObservationLogBatch } from '@n8n/agents';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { AgentObservationEntity } from '../../entities/agent-observation.entity';
import { AgentObservationRepository } from '../../repositories/agent-observation.repository';
import { AgentRepository } from '../../repositories/agent.repository';
import { N8nMemory, type N8nMemoryImpl } from '../n8n-memory';

describe('N8nMemoryImpl', () => {
	let repository: AgentThreadRepository;
	let memory: N8nMemoryImpl;
	let otherMemory: N8nMemoryImpl;
	let observations: AgentObservationRepository;

	beforeAll(async () => {
		// The concurrent tests need real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentThreadRepository);
		observations = Container.get(AgentObservationRepository);
		const project = await createTeamProject();
		const agents = Container.get(AgentRepository);
		const [first, second] = await agents.save(
			['First agent', 'Second agent'].map((name) =>
				agents.create({ name, projectId: project.id, integrations: [] }),
			),
		);
		memory = Container.get(N8nMemory).getImplementation(first.id);
		otherMemory = Container.get(N8nMemory).getImplementation(second.id);
	});

	beforeEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function readMetadata(): Promise<unknown> {
		const row = await repository.findOneByOrFail({ id: 'thread-1' });
		return jsonParse(row.metadata ?? 'null');
	}

	describe('commitObservationLogBatch', () => {
		const now = new Date('2026-05-12T10:00:00.000Z');

		beforeEach(async () => {
			await memory.saveThread({ id: 'thread-1', resourceId: 'user-1' });
			await memory.saveThread({ id: 'thread-2', resourceId: 'user-1' });
		});

		function batch(
			expectedCursor: ObservationCursor | null = null,
			observationScopeId = 'thread-1',
		): ObservationLogBatch {
			return {
				observationScopeId,
				expectedCursor,
				nextCursor: {
					observationScopeId,
					lastObservedMessageId: 'm2',
					lastObservedAt: new Date(2),
					updatedAt: now,
				},
				entries: [
					{
						marker: 'important',
						text: 'Decision',
						parentIndex: null,
						tokenCount: 2,
						createdAt: now,
					},
					{
						marker: 'completion',
						text: 'Done',
						parentIndex: 0,
						tokenCount: 3,
						createdAt: new Date(now.getTime() + 1),
					},
				],
			};
		}

		it('persists a complete ordered batch and rejects its replay', async () => {
			const input = batch();
			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			const rows = await memory.getObservationLog(input);
			expect(rows).toMatchObject([
				{ text: 'Decision', parentId: null, tokenCount: 2, createdAt: now },
				{
					text: 'Done',
					parentId: rows[0].id,
					tokenCount: 3,
					createdAt: new Date(now.getTime() + 1),
				},
			]);
			expect(await memory.getCursor('thread-1')).toEqual(input.nextCursor);
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await memory.getObservationLog(input)).toEqual(rows);
		});

		it.each([false, true])(
			'accepts only one competing writer with an existing cursor: %s',
			async (existing) => {
				if (existing) await memory.commitObservationLogBatch(batch());
				const input = batch(await memory.getCursor('thread-1'));
				if (existing) {
					input.nextCursor.lastObservedMessageId = 'm3';
					input.nextCursor.lastObservedAt = new Date(3);
					input.nextCursor.updatedAt = new Date(0);
				}
				const results = await Promise.all([
					memory.commitObservationLogBatch(input),
					memory.commitObservationLogBatch(input),
				]);
				expect(results.sort()).toEqual(['committed', 'stale']);
				expect(await memory.getObservationLog(input)).toHaveLength(existing ? 4 : 2);
				expect(await memory.getCursor('thread-1')).toEqual({
					...input.nextCursor,
					updatedAt: new Date(now.getTime() + (existing ? 1 : 0)),
				});
			},
		);

		it.each(['message', 'time', 'revision', 'backwards-time', 'backwards-id'])(
			'rejects %s progress without changing stored state',
			async (change) => {
				await memory.commitObservationLogBatch(batch());
				const cursor = await memory.getCursor('thread-1');
				const input = batch(cursor);
				const rows = await memory.getObservationLog(input);
				if (change === 'message')
					input.expectedCursor = { ...cursor!, lastObservedMessageId: 'm1' };
				if (change === 'time') input.expectedCursor = { ...cursor!, lastObservedAt: new Date(0) };
				if (change === 'revision') input.expectedCursor = { ...cursor!, updatedAt: new Date(0) };
				if (change === 'backwards-time') input.nextCursor.lastObservedAt = new Date(1);
				if (change === 'backwards-id') input.nextCursor.lastObservedMessageId = 'm1';
				expect(await memory.commitObservationLogBatch(input)).toBe('stale');
				expect(await memory.getObservationLog(input)).toEqual(rows);
				expect(await memory.getCursor('thread-1')).toEqual(cursor);
			},
		);

		it('rebuilds an unchanged boundary once with a monotonic cursor revision', async () => {
			await memory.commitObservationLogBatch(batch());
			await observations.delete({ observationScopeId: 'thread-1' });
			const input = batch(await memory.getCursor('thread-1'));
			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			expect(await memory.getCursor('thread-1')).toEqual({
				...input.nextCursor,
				updatedAt: new Date(now.getTime() + 1),
			});
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await memory.getActiveObservationLog(input)).toHaveLength(2);
		});

		it.each([
			{ failure: 'observation', existing: false },
			{ failure: 'observation', existing: true },
			{ failure: 'observation-unique', existing: true },
			{ failure: 'cursor', existing: false },
			{ failure: 'cursor', existing: true },
		])(
			'rolls back a $failure failure with an existing cursor: $existing',
			async ({ failure, existing }) => {
				if (existing) await memory.commitObservationLogBatch(batch());
				const cursor = await memory.getCursor('thread-1');
				const input = batch(cursor);
				const rows = await memory.getObservationLog(input);
				if (failure === 'observation') input.entries[1].text = null as unknown as string;
				if (failure === 'cursor')
					input.nextCursor.lastObservedMessageId = null as unknown as string;
				const generateId = vi.spyOn(AgentObservationEntity.prototype, 'generateId');
				if (failure === 'observation-unique')
					generateId.mockImplementation(function () {
						this.id = 'batch-entry';
					});
				try {
					await expect(memory.commitObservationLogBatch(input)).rejects.toThrow();
				} finally {
					generateId.mockRestore();
				}
				expect(await memory.getObservationLog(input)).toEqual(rows);
				expect(await memory.getCursor('thread-1')).toEqual(cursor);
				input.entries[1].text = 'Done';
				input.nextCursor.lastObservedMessageId = 'm2';
				expect(await memory.commitObservationLogBatch(input)).toBe('committed');
				expect(await memory.commitObservationLogBatch(input)).toBe('stale');
				expect(await memory.getObservationLog(input)).toHaveLength(rows.length + 2);
			},
		);

		it('keeps guards and observations isolated by agent and scope', async () => {
			await memory.commitObservationLogBatch(batch());
			const cursor = await memory.getCursor('thread-1');
			expect(await otherMemory.commitObservationLogBatch(batch(cursor))).toBe('stale');
			expect(await otherMemory.getCursor('thread-1')).toBeNull();
			expect(await otherMemory.getObservationLog({ observationScopeId: 'thread-1' })).toEqual([]);
			expect(await otherMemory.commitObservationLogBatch(batch())).toBe('committed');
			expect(await memory.commitObservationLogBatch(batch(null, 'thread-2'))).toBe('committed');
			expect(await memory.getCursor('thread-1')).toEqual(cursor);
			expect(await memory.getObservationLog({ observationScopeId: 'thread-1' })).toHaveLength(2);
			expect(await otherMemory.getObservationLog({ observationScopeId: 'thread-1' })).toHaveLength(
				2,
			);
			expect(await memory.getObservationLog({ observationScopeId: 'thread-2' })).toHaveLength(2);
		});
	});

	describe('saveThread', () => {
		it('keeps every write when saves and patches run at the same time', async () => {
			await memory.saveThread({ id: 'thread-1', resourceId: 'user-1', metadata: { count: 0 } });

			const patch = async () =>
				await memory.patchThread({
					threadId: 'thread-1',
					update: ({ metadata }) => ({
						metadata: { ...metadata, count: (metadata?.count as number) + 1 },
					}),
				});
			const touch = async () => await memory.saveThread({ id: 'thread-1', resourceId: 'user-1' });
			const save = async (i: number) =>
				await memory.saveThread({
					id: 'thread-1',
					resourceId: 'user-1',
					metadata: { [`key${i}`]: true },
				});

			await Promise.all(
				Array.from({ length: 10 }, async (_, i) => await Promise.all([patch(), touch(), save(i)])),
			);

			expect(await readMetadata()).toEqual({
				count: 10,
				...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`key${i}`, true])),
			});
		});

		it('writes nothing when the save carries no title or metadata', async () => {
			const created = await memory.saveThread({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: { keep: 1 },
			});

			const saved = await memory.saveThread({ id: 'thread-1', resourceId: 'user-2' });

			expect(saved).toMatchObject({ resourceId: 'user-1', title: 'Chat', metadata: { keep: 1 } });
			const row = await repository.findOneByOrFail({ id: 'thread-1' });
			expect(row.updatedAt.getTime()).toBe(created.updatedAt.getTime());
		});
	});
});
