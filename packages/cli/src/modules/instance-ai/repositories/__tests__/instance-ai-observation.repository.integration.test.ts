import type { ObservationCursor, ObservationLogBatch } from '@n8n/agents';
import { getPersonalProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { createOwner } from '@test-integration/db/users';

import { InstanceAiObservationRepository } from '../instance-ai-observation.repository';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';
import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { InstanceAiObservation } from '../../entities/instance-ai-observation.entity';

/**
 * `findActiveForThread` feeds the eval memory endpoint. A superseded or dropped
 * row is no longer what the agent remembers, and order is what a judge reads as
 * the story, so both are pinned against a real database.
 */
describe('InstanceAiObservationRepository', () => {
	let repository: InstanceAiObservationRepository;
	let table: Repository<InstanceAiObservation>;
	let memory: TypeORMAgentMemory;

	const THREAD = '11111111-1111-4111-8111-111111111111';
	const OTHER_THREAD = '22222222-2222-4222-8222-222222222222';

	beforeAll(async () => {
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiObservationRepository);
		table = Container.get(DataSource).getRepository(InstanceAiObservation);
		memory = Container.get(TypeORMAgentMemory);
		// Observations hang off a thread, and a thread off a project.
		const project = await getPersonalProject(await createOwner());
		const threads = Container.get(InstanceAiThreadRepository);
		await threads.save(
			[THREAD, OTHER_THREAD].map((id) =>
				threads.create({ id, resourceId: `res-${id}`, projectId: project.id, title: '' }),
			),
		);
	});

	afterEach(async () => {
		// Not in the shared truncate list; a module table cleans up through its repository.
		await table.delete({});
		await Container.get(InstanceAiObservationCursorRepository).delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function row(
		text: string,
		status: 'active' | 'superseded' | 'dropped',
		createdAt: string,
		scope = THREAD,
	) {
		return table.create({
			observationScopeId: scope,
			marker: 'info' as const,
			text,
			parentId: null,
			tokenCount: 3,
			status,
			supersededBy: null,
			createdAt: new Date(createdAt),
		});
	}

	it('returns only the live rows of the thread, oldest first', async () => {
		await table.save([
			row('third', 'active', '2026-01-01T00:00:03.000Z'),
			row('first', 'active', '2026-01-01T00:00:01.000Z'),
			row('replaced', 'superseded', '2026-01-01T00:00:02.000Z'),
			row('forgotten', 'dropped', '2026-01-01T00:00:02.500Z'),
			row('elsewhere', 'active', '2026-01-01T00:00:00.000Z', OTHER_THREAD),
		]);

		const rows = await repository.findActiveForThread(THREAD, {});

		expect(rows.map((r) => r.text)).toEqual(['first', 'third']);
	});

	it('returns an empty list when the observer never ran', async () => {
		expect(await repository.findActiveForThread(THREAD, {})).toEqual([]);
	});

	it('generates log entry ids and preserves filters, ordering and lifecycle updates', async () => {
		const scope = { observationScopeId: THREAD };
		const [first, second] = await memory.appendObservationLogEntries(
			['first', 'second'].map((text, index) => ({
				...scope,
				marker: 'info' as const,
				text,
				createdAt: new Date(index + 1),
			})),
		);
		expect(first.id).toEqual(expect.any(String));
		expect(second.id).not.toBe(first.id);
		const [child] = await memory.appendObservationLogEntries([
			{ ...scope, marker: 'info', text: 'child', parentId: first.id },
		]);
		expect(await memory.getObservationLog({ ...scope, parentId: first.id })).toEqual([child]);
		expect(
			await memory.getObservationLog({ ...scope, parentId: null, order: 'desc', limit: 1 }),
		).toEqual([second]);
		await memory.dropObservationLogEntries([first.id]);
		await memory.supersedeObservationLogEntries([second.id], child.id);
		expect(await memory.getActiveObservationLog(scope)).toEqual([child]);
		expect(await memory.getObservationLog({ ...scope, status: 'superseded' })).toEqual([
			{ ...second, status: 'superseded', supersededBy: child.id },
		]);
		expect(await memory.getObservationLog({ ...scope, status: 'dropped' })).toEqual([
			{ ...first, status: 'dropped' },
		]);
	});

	it.each([false, true])('applies reflection atomically with a write failure: %s', async (fail) => {
		const saved = await table.save([
			row('drop', 'active', '2026-01-01T00:00:01.000Z'),
			row('replace', 'active', '2026-01-01T00:00:02.000Z'),
			row('elsewhere', 'active', '2026-01-01T00:00:03.000Z', OTHER_THREAD),
		]);
		const scope = { observationScopeId: THREAD };
		const before = await memory.getObservationLog(scope);
		const update = repository.updateLifecycleForScopeEntries.bind(repository);
		const write = vi.spyOn(repository, 'updateLifecycleForScopeEntries');
		if (fail) {
			write.mockImplementationOnce(async (...args) => {
				await update(...args);
				throw new Error('Write failed');
			});
		}
		try {
			const result = memory.applyObservationLogReflection(scope, {
				drop: [saved[0].id, saved[2].id],
				merge: [{ supersedes: [saved[1].id], marker: 'important', text: 'replacement' }],
			});
			if (fail) {
				await expect(result).rejects.toThrow('Write failed');
				expect(await memory.getObservationLog(scope)).toEqual(before);
			} else {
				const reflected = await result;
				expect(reflected.droppedIds).toEqual([saved[0].id]);
				expect(reflected.supersededIds).toEqual([saved[1].id]);
				expect(reflected.inserted).toHaveLength(1);
				expect(reflected.inserted[0].id).toEqual(expect.any(String));
				expect(await memory.getActiveObservationLog(scope)).toEqual(reflected.inserted);
				expect(await memory.getObservationLog({ ...scope, status: 'superseded' })).toEqual([
					{ ...before[1], status: 'superseded', supersededBy: reflected.inserted[0].id },
				]);
				expect(await memory.getObservationLog({ ...scope, status: 'dropped' })).toEqual([
					{ ...before[0], status: 'dropped' },
				]);
			}
		} finally {
			write.mockRestore();
		}
		expect(await repository.findActiveForThread(OTHER_THREAD, {})).toHaveLength(1);
	});

	describe('commitObservationLogBatch', () => {
		const now = new Date('2026-05-12T10:00:00.000Z');

		function batch(
			expectedCursor: ObservationCursor | null = null,
			observationScopeId = THREAD,
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
			expect(await memory.getCursor(THREAD)).toEqual(input.nextCursor);
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await memory.getObservationLog(input)).toEqual(rows);
		});

		it('advances a cursor-only batch without changing active observations', async () => {
			await memory.commitObservationLogBatch(batch());
			const input = batch(await memory.getCursor(THREAD));
			const rows = await memory.getActiveObservationLog(input);
			input.entries = [];
			input.nextCursor.lastObservedMessageId = 'm3';
			input.nextCursor.lastObservedAt = new Date(3);

			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			expect(await memory.getCursor(THREAD)).toEqual({
				...input.nextCursor,
				updatedAt: new Date(now.getTime() + 1),
			});
			expect(await memory.getObservationLog(input)).toEqual(rows);
		});

		it.each([false, true])(
			'accepts only one competing writer with an existing cursor: %s',
			async (existing) => {
				if (existing) await memory.commitObservationLogBatch(batch());
				const input = batch(await memory.getCursor(THREAD));
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
				expect(await memory.getCursor(THREAD)).toEqual({
					...input.nextCursor,
					updatedAt: new Date(now.getTime() + (existing ? 1 : 0)),
				});
			},
		);

		it.each(['message', 'time', 'revision', 'backwards-time', 'backwards-id'])(
			'rejects %s progress without changing stored state',
			async (change) => {
				await memory.commitObservationLogBatch(batch());
				const cursor = await memory.getCursor(THREAD);
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
				expect(await memory.getCursor(THREAD)).toEqual(cursor);
			},
		);

		it('rebuilds an unchanged boundary once with a monotonic cursor revision', async () => {
			await memory.commitObservationLogBatch(batch());
			await table.delete({ observationScopeId: THREAD });
			const input = batch(await memory.getCursor(THREAD));
			expect(await memory.commitObservationLogBatch(input)).toBe('committed');
			expect(await memory.getCursor(THREAD)).toEqual({
				...input.nextCursor,
				updatedAt: new Date(now.getTime() + 1),
			});
			expect(await memory.commitObservationLogBatch(input)).toBe('stale');
			expect(await repository.findActiveForThread(THREAD, {})).toHaveLength(2);
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
				const cursor = await memory.getCursor(THREAD);
				const input = batch(cursor);
				const rows = await memory.getObservationLog(input);
				if (failure === 'observation') input.entries[1].text = null as unknown as string;
				if (failure === 'cursor')
					input.nextCursor.lastObservedMessageId = null as unknown as string;
				const generateId = vi.spyOn(InstanceAiObservation.prototype, 'generateId');
				if (failure === 'observation-unique')
					generateId.mockImplementation(function (this: InstanceAiObservation) {
						this.id = 'batch-entry';
					});
				try {
					await expect(memory.commitObservationLogBatch(input)).rejects.toThrow();
				} finally {
					generateId.mockRestore();
				}
				expect(await memory.getObservationLog(input)).toEqual(rows);
				expect(await memory.getCursor(THREAD)).toEqual(cursor);
				input.entries[1].text = 'Done';
				input.nextCursor.lastObservedMessageId = 'm2';
				expect(await memory.commitObservationLogBatch(input)).toBe('committed');
				expect(await memory.commitObservationLogBatch(input)).toBe('stale');
				expect(await memory.getObservationLog(input)).toHaveLength(rows.length + 2);
			},
		);

		it('keeps guards and observations isolated by scope', async () => {
			await memory.commitObservationLogBatch(batch());
			const cursor = await memory.getCursor(THREAD);
			expect(await memory.commitObservationLogBatch(batch(null, OTHER_THREAD))).toBe('committed');
			expect(await memory.getCursor(THREAD)).toEqual(cursor);
			expect(await memory.getObservationLog({ observationScopeId: THREAD })).toHaveLength(2);
			expect(await memory.getObservationLog({ observationScopeId: OTHER_THREAD })).toHaveLength(2);
		});
	});
});
