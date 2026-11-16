import { InMemoryMemory } from '../memory/memory-store';
import type { ObservationCursor, ObservationLogBatch } from '../../types';

const batchTime = new Date('2026-05-12T10:00:00Z');

function observationBatch(expectedCursor: ObservationCursor | null = null): ObservationLogBatch {
	return {
		observationScopeId: 'thread-1',
		expectedCursor,
		nextCursor: {
			observationScopeId: 'thread-1',
			lastObservedMessageId: 'm2',
			lastObservedAt: new Date(2),
			updatedAt: new Date(batchTime),
		},
		entries: [
			{
				marker: 'important',
				text: 'Decision',
				parentIndex: null,
				tokenCount: 2,
				createdAt: batchTime,
			},
			{
				marker: 'completion',
				text: 'Completed',
				parentIndex: 0,
				tokenCount: 3,
				createdAt: new Date(batchTime.getTime() + 1),
			},
		],
	};
}

describe('observation log store', () => {
	it('commits a complete batch once and clones its stored values', async () => {
		const store = new InMemoryMemory();
		const batch = observationBatch();
		expect(await store.commitObservationLogBatch(batch)).toBe('committed');
		const rows = await store.getObservationLog(batch);
		expect(rows).toMatchObject([
			{ text: 'Decision', parentId: null, tokenCount: 2, createdAt: batchTime },
			{ text: 'Completed', parentId: rows[0].id, tokenCount: 3 },
		]);
		const cursor = await store.getCursor('thread-1');
		expect(cursor).toEqual(batch.nextCursor);
		expect(await store.commitObservationLogBatch(batch)).toBe('stale');
		expect(await store.getObservationLog(batch)).toEqual(rows);
		batch.nextCursor.updatedAt.setTime(0);
		batch.entries[1].createdAt.setTime(0);
		rows[0].createdAt.setTime(0);
		cursor!.updatedAt.setTime(0);
		expect(await store.getCursor('thread-1')).toMatchObject({ updatedAt: batchTime });
		expect((await store.getObservationLog(batch))[0].createdAt).toEqual(batchTime);
		expect((await store.getObservationLog(batch))[1].createdAt.getTime()).toBe(
			batchTime.getTime() + 1,
		);
	});

	it.each([false, true])(
		'accepts only one competing writer with an existing cursor: %s',
		async (existing) => {
			const store = new InMemoryMemory();
			if (existing) await store.commitObservationLogBatch(observationBatch());
			const expected = await store.getCursor('thread-1');
			const input = observationBatch(expected);
			if (existing) {
				input.nextCursor.lastObservedMessageId = 'm3';
				input.nextCursor.lastObservedAt = new Date(3);
				input.nextCursor.updatedAt = new Date(0);
			}
			const results = await Promise.all([
				store.commitObservationLogBatch(input),
				store.commitObservationLogBatch(input),
			]);
			expect(results.sort()).toEqual(['committed', 'stale']);
			expect(await store.getObservationLog({ observationScopeId: 'thread-1' })).toHaveLength(
				existing ? 4 : 2,
			);
			expect(await store.getCursor('thread-1')).toEqual({
				...input.nextCursor,
				updatedAt: new Date(batchTime.getTime() + (existing ? 1 : 0)),
			});
		},
	);

	it.each(['message', 'time', 'revision', 'backwards-time', 'backwards-id'])(
		'rejects %s cursor changes without changing stored state',
		async (change) => {
			const store = new InMemoryMemory();
			await store.commitObservationLogBatch(observationBatch());
			const cursor = await store.getCursor('thread-1');
			const rows = await store.getObservationLog({ observationScopeId: 'thread-1' });
			const batch = observationBatch(cursor);
			if (change === 'message') batch.expectedCursor = { ...cursor!, lastObservedMessageId: 'm1' };
			if (change === 'time') batch.expectedCursor = { ...cursor!, lastObservedAt: new Date(0) };
			if (change === 'revision') batch.expectedCursor = { ...cursor!, updatedAt: new Date(0) };
			if (change === 'backwards-time') batch.nextCursor.lastObservedAt = new Date(1);
			if (change === 'backwards-id') batch.nextCursor.lastObservedMessageId = 'm1';
			expect(await store.commitObservationLogBatch(batch)).toBe('stale');
			expect(await store.getObservationLog(batch)).toEqual(rows);
			expect(await store.getCursor('thread-1')).toEqual(cursor);
		},
	);

	it('stages parent links before changing either observations or the cursor', async () => {
		const store = new InMemoryMemory();
		const batch = observationBatch();
		batch.entries[1].parentIndex = 1;
		await expect(async () => await store.commitObservationLogBatch(batch)).rejects.toThrow(
			'earlier entries',
		);
		expect(await store.getObservationLog(batch)).toEqual([]);
		expect(await store.getCursor('thread-1')).toBeNull();
		batch.entries[1].parentIndex = 0;
		expect(await store.commitObservationLogBatch(batch)).toBe('committed');
	});

	it('persists marker-based active observations with default mechanics', async () => {
		const store = new InMemoryMemory();
		const createdAt = new Date('2026-05-12T10:00:00Z');

		const [entry] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'critical',
				text: 'User chose the observation log model.',
				createdAt,
			},
		]);

		expect(entry).toMatchObject({
			observationScopeId: 'thread-1',
			marker: 'critical',
			text: 'User chose the observation log model.',
			parentId: null,
			status: 'active',
			supersededBy: null,
			tokenCount: 7,
			createdAt,
		});

		await expect(
			store.getActiveObservationLog({ observationScopeId: 'thread-1' }),
		).resolves.toEqual([entry]);
	});

	it('keeps dropped and superseded observations out of the active read path', async () => {
		const store = new InMemoryMemory();
		const [dropped, superseded, replacement] = await store.appendObservationLogEntries([
			{ observationScopeId: 'thread-1', marker: 'info', text: 'Small detail' },
			{ observationScopeId: 'thread-1', marker: 'important', text: 'Old plan' },
			{ observationScopeId: 'thread-1', marker: 'important', text: 'New plan' },
		]);

		await store.dropObservationLogEntries([dropped.id]);
		await store.supersedeObservationLogEntries([superseded.id], replacement.id);

		await expect(
			store.getActiveObservationLog({ observationScopeId: 'thread-1' }),
		).resolves.toEqual([replacement]);
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'dropped' }),
		).resolves.toMatchObject([{ id: dropped.id, status: 'dropped', supersededBy: null }]);
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'superseded' }),
		).resolves.toMatchObject([
			{ id: superseded.id, status: 'superseded', supersededBy: replacement.id },
		]);
	});

	it('applies reflection as drops plus merged replacements', async () => {
		const store = new InMemoryMemory();
		const [stale, oldA, oldB] = await store.appendObservationLogEntries([
			{ observationScopeId: 'thread-1', marker: 'info', text: 'Tiny aside' },
			{ observationScopeId: 'thread-1', marker: 'important', text: 'Plan A' },
			{ observationScopeId: 'thread-1', marker: 'important', text: 'Plan B' },
		]);

		const result = await store.applyObservationLogReflection(
			{ observationScopeId: 'thread-1' },
			{
				drop: [stale.id],
				merge: [
					{
						supersedes: [oldA.id, oldB.id],
						marker: 'important',
						text: 'User compared Plan A and Plan B.',
					},
				],
			},
		);

		expect(result.droppedIds).toEqual([stale.id]);
		expect(result.supersededIds).toEqual([oldA.id, oldB.id]);
		expect(result.inserted).toHaveLength(1);
		await expect(
			store.getActiveObservationLog({ observationScopeId: 'thread-1' }),
		).resolves.toEqual(result.inserted);
	});

	it('ignores child-only drops while the parent remains active', async () => {
		const store = new InMemoryMemory();
		const [parent] = await store.appendObservationLogEntries([
			{ observationScopeId: 'thread-1', marker: 'important', text: 'Open case' },
		]);
		const [child] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'completion',
				text: 'Case closed',
				parentId: parent.id,
			},
		]);

		const result = await store.applyObservationLogReflection(
			{ observationScopeId: 'thread-1' },
			{ drop: [child.id], merge: [] },
		);

		expect(result.droppedIds).toEqual([]);
		const active = await store.getActiveObservationLog({
			observationScopeId: 'thread-1',
		});
		expect(active).toHaveLength(2);
		expect(active).toEqual(expect.arrayContaining([parent, child]));
	});

	it('supersedes children when their parent is merged', async () => {
		const store = new InMemoryMemory();
		const [parent] = await store.appendObservationLogEntries([
			{ observationScopeId: 'thread-1', marker: 'important', text: 'Open case' },
		]);
		const [child] = await store.appendObservationLogEntries([
			{
				observationScopeId: 'thread-1',
				marker: 'completion',
				text: 'Case closed',
				parentId: parent.id,
			},
		]);

		const result = await store.applyObservationLogReflection(
			{ observationScopeId: 'thread-1' },
			{
				drop: [],
				merge: [
					{
						supersedes: [parent.id],
						marker: 'important',
						text: 'Case resolved.',
					},
				],
			},
		);

		expect(result.supersededIds).toEqual([parent.id, child.id]);
		await expect(
			store.getObservationLog({ observationScopeId: 'thread-1', status: 'superseded' }),
		).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: parent.id, status: 'superseded' }),
				expect.objectContaining({ id: child.id, status: 'superseded' }),
			]),
		);
	});

	it('persists concurrent appends to the same initially empty scope', async () => {
		const store = new InMemoryMemory();

		const [[first], [second]] = await Promise.all([
			store.appendObservationLogEntries([
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: 'First concurrent observation',
				},
			]),
			store.appendObservationLogEntries([
				{
					observationScopeId: 'thread-1',
					marker: 'info',
					text: 'Second concurrent observation',
				},
			]),
		]);

		const persisted = await store.getObservationLog({ observationScopeId: 'thread-1' });
		expect(persisted).toEqual(expect.arrayContaining([first, second]));
		expect(persisted).toHaveLength(2);
	});
});
