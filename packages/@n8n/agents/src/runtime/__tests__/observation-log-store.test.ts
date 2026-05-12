import { InMemoryMemory } from '../memory-store';
import { estimateObservationTokens } from '../../types/sdk/observation-log';

describe('observation log store', () => {
	it('persists marker-based active observations with default mechanics', async () => {
		const store = new InMemoryMemory();
		const createdAt = new Date('2026-05-12T10:00:00Z');

		const [entry] = await store.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'critical',
				text: 'User chose the observation log model.',
				createdAt,
			},
		]);

		expect(entry).toMatchObject({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			marker: 'critical',
			text: 'User chose the observation log model.',
			parentId: null,
			status: 'active',
			supersededBy: null,
			tokenCount: estimateObservationTokens('User chose the observation log model.'),
			createdAt,
		});

		await expect(
			store.getActiveObservationLog({ scopeKind: 'thread', scopeId: 'thread-1' }),
		).resolves.toEqual([entry]);
	});

	it('keeps dropped and superseded observations out of the active read path', async () => {
		const store = new InMemoryMemory();
		const [dropped, superseded, replacement] = await store.appendObservationLogEntries([
			{ scopeKind: 'thread', scopeId: 'thread-1', marker: 'info', text: 'Small detail' },
			{ scopeKind: 'thread', scopeId: 'thread-1', marker: 'important', text: 'Old plan' },
			{ scopeKind: 'thread', scopeId: 'thread-1', marker: 'important', text: 'New plan' },
		]);

		await store.dropObservationLogEntries([dropped.id]);
		await store.supersedeObservationLogEntries([superseded.id], replacement.id);

		await expect(
			store.getActiveObservationLog({ scopeKind: 'thread', scopeId: 'thread-1' }),
		).resolves.toEqual([replacement]);
		await expect(
			store.getObservationLog({ scopeKind: 'thread', scopeId: 'thread-1', status: 'dropped' }),
		).resolves.toMatchObject([{ id: dropped.id, status: 'dropped', supersededBy: null }]);
		await expect(
			store.getObservationLog({ scopeKind: 'thread', scopeId: 'thread-1', status: 'superseded' }),
		).resolves.toMatchObject([
			{ id: superseded.id, status: 'superseded', supersededBy: replacement.id },
		]);
	});

	it('applies reflection as drops plus merged replacements', async () => {
		const store = new InMemoryMemory();
		const [stale, oldA, oldB] = await store.appendObservationLogEntries([
			{ scopeKind: 'resource', scopeId: 'user-1', marker: 'info', text: 'Tiny aside' },
			{ scopeKind: 'resource', scopeId: 'user-1', marker: 'important', text: 'Plan A' },
			{ scopeKind: 'resource', scopeId: 'user-1', marker: 'important', text: 'Plan B' },
		]);

		const result = await store.applyObservationLogReflection(
			{ scopeKind: 'resource', scopeId: 'user-1' },
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
			store.getActiveObservationLog({ scopeKind: 'resource', scopeId: 'user-1' }),
		).resolves.toEqual(result.inserted);
	});

	it('ignores child-only drops while the parent remains active', async () => {
		const store = new InMemoryMemory();
		const [parent] = await store.appendObservationLogEntries([
			{ scopeKind: 'thread', scopeId: 'thread-1', marker: 'important', text: 'Open case' },
		]);
		const [child] = await store.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'completion',
				text: 'Case closed',
				parentId: parent.id,
			},
		]);

		const result = await store.applyObservationLogReflection(
			{ scopeKind: 'thread', scopeId: 'thread-1' },
			{ drop: [child.id], merge: [] },
		);

		expect(result.droppedIds).toEqual([]);
		const active = await store.getActiveObservationLog({
			scopeKind: 'thread',
			scopeId: 'thread-1',
		});
		expect(active).toHaveLength(2);
		expect(active).toEqual(expect.arrayContaining([parent, child]));
	});

	it('supersedes children when their parent is merged', async () => {
		const store = new InMemoryMemory();
		const [parent] = await store.appendObservationLogEntries([
			{ scopeKind: 'thread', scopeId: 'thread-1', marker: 'important', text: 'Open case' },
		]);
		const [child] = await store.appendObservationLogEntries([
			{
				scopeKind: 'thread',
				scopeId: 'thread-1',
				marker: 'completion',
				text: 'Case closed',
				parentId: parent.id,
			},
		]);

		const result = await store.applyObservationLogReflection(
			{ scopeKind: 'thread', scopeId: 'thread-1' },
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
			store.getObservationLog({ scopeKind: 'thread', scopeId: 'thread-1', status: 'superseded' }),
		).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: parent.id, status: 'superseded' }),
				expect.objectContaining({ id: child.id, status: 'superseded' }),
			]),
		);
	});
});
