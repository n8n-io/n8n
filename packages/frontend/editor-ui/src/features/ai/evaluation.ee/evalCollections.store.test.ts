import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEvalCollectionsStore } from './evalCollections.store';
import type {
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	EvalVersionsResponse,
} from './evalCollections.types';
import type { CreateCollectionResponse } from './evalCollections.api';

const {
	getCollections,
	getCollection,
	createCollection,
	updateCollection,
	deleteCollection,
	addRunToCollection,
	removeRunFromCollection,
	getEvalVersions,
	generateInsights,
} = vi.hoisted(() => ({
	getCollections: vi.fn(),
	getCollection: vi.fn(),
	createCollection: vi.fn(),
	updateCollection: vi.fn(),
	deleteCollection: vi.fn(),
	addRunToCollection: vi.fn(),
	removeRunFromCollection: vi.fn(),
	getEvalVersions: vi.fn(),
	generateInsights: vi.fn(),
}));

vi.mock('./evalCollections.api', () => ({
	getCollections,
	getCollection,
	createCollection,
	updateCollection,
	deleteCollection,
	addRunToCollection,
	removeRunFromCollection,
	getEvalVersions,
	generateInsights,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const RECORD: EvaluationCollectionRecord = {
	id: 'col-1',
	name: 'Tone tuning experiment',
	description: null,
	workflowId: 'wf-1',
	evaluationConfigId: 'cfg-1',
	createdById: 'user-1',
	createdAt: '2026-05-15T08:00:00Z',
	updatedAt: '2026-05-15T08:00:00Z',
	runCount: 2,
};

const COMPLETED_DETAIL: EvaluationCollectionDetail = {
	...RECORD,
	runs: [
		{
			testRunId: 'run-a',
			workflowVersionId: null,
			status: 'completed',
			runAt: '2026-05-15T08:01:00Z',
			completedAt: '2026-05-15T08:05:00Z',
			avgScore: 0.8,
			metrics: { helpfulness: 0.8 },
		},
		{
			testRunId: 'run-b',
			workflowVersionId: 'v1',
			status: 'completed',
			runAt: '2026-05-15T08:01:00Z',
			completedAt: '2026-05-15T08:06:00Z',
			avgScore: 0.84,
			metrics: { helpfulness: 0.84 },
		},
	],
};

const RUNNING_DETAIL: EvaluationCollectionDetail = {
	...RECORD,
	runs: [
		{
			testRunId: 'run-a',
			workflowVersionId: null,
			status: 'running',
			runAt: '2026-05-15T08:01:00Z',
			completedAt: null,
			avgScore: null,
			metrics: null,
		},
	],
};

const VERSIONS: EvalVersionsResponse = {
	evaluationConfigId: 'cfg-1',
	versions: [],
};

const flushPromises = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

describe('evalCollections.store', () => {
	let store: ReturnType<typeof useEvalCollectionsStore>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useEvalCollectionsStore();

		getCollections.mockResolvedValue([RECORD]);
		getCollection.mockResolvedValue(COMPLETED_DETAIL);
		createCollection.mockResolvedValue({
			...RECORD,
			runsStartedIds: [],
		} satisfies CreateCollectionResponse);
		updateCollection.mockResolvedValue({ ...RECORD, name: 'renamed' });
		deleteCollection.mockResolvedValue({ success: true, runsUnlinked: 0 });
		addRunToCollection.mockResolvedValue(COMPLETED_DETAIL);
		removeRunFromCollection.mockResolvedValue({ success: true, affected: 1 });
		getEvalVersions.mockResolvedValue(VERSIONS);
		generateInsights.mockResolvedValue({
			generatedAt: '2026-05-15T08:10:00Z',
			modelUsed: 'deterministic',
			status: 'fallback',
			insights: {
				winner: null,
				regressions: [],
				suggestedNext: { kind: 'lockIn', summary: 'looks stable' },
			},
		});
	});

	afterEach(() => {
		store.cleanupPolling();
		vi.useRealTimers();
	});

	describe('fetch + cache', () => {
		it('caches collections per workflow id', async () => {
			const result = await store.fetchCollections('wf-1');

			expect(getCollections).toHaveBeenCalledWith({ instanceId: 'test-instance-id' }, 'wf-1');
			expect(result).toEqual([RECORD]);
			expect(store.getCollections('wf-1')).toEqual([RECORD]);
			expect(store.getCollections('other-wf')).toEqual([]);
		});

		it('stores detail under collectionId', async () => {
			const result = await store.fetchCollectionDetail('wf-1', 'col-1');

			expect(result).toEqual(COMPLETED_DETAIL);
			expect(store.getDetail('col-1')).toEqual(COMPLETED_DETAIL);
		});

		it('stores versions under evaluationConfigId', async () => {
			await store.fetchEvalVersions('wf-1', 'cfg-1');

			expect(getEvalVersions).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				'wf-1',
				'cfg-1',
			);
			expect(store.getVersions('cfg-1')).toEqual(VERSIONS);
		});
	});

	describe('createCollection', () => {
		it('prepends the new record to the workflow list', async () => {
			await store.fetchCollections('wf-1');
			createCollection.mockResolvedValue({
				...RECORD,
				id: 'col-2',
				runsStartedIds: ['run-x'],
			} satisfies CreateCollectionResponse);
			getCollection.mockResolvedValue({ ...COMPLETED_DETAIL, id: 'col-2' });

			const result = await store.createCollection('wf-1', {
				name: 'New',
				evaluationConfigId: 'cfg-1',
				versions: [{ workflowVersionId: null }],
			});

			expect(result.runsStartedIds).toEqual(['run-x']);
			expect(store.getCollections('wf-1').map((c) => c.id)).toEqual(['col-2', 'col-1']);
		});
	});

	describe('deleteCollection', () => {
		it('removes the record, detail, and insights caches', async () => {
			await store.fetchCollections('wf-1');
			await store.fetchCollectionDetail('wf-1', 'col-1');
			await store.generateInsights('wf-1', 'col-1');

			expect(store.getDetail('col-1')).not.toBeNull();
			expect(store.getInsights('col-1')).not.toBeNull();

			await store.deleteCollection('wf-1', 'col-1');

			expect(store.getCollections('wf-1')).toEqual([]);
			expect(store.getDetail('col-1')).toBeNull();
			expect(store.getInsights('col-1')).toBeNull();
		});
	});

	describe('mutations bust local insights cache', () => {
		it('drops cached insights when adding a run', async () => {
			await store.generateInsights('wf-1', 'col-1');
			expect(store.getInsights('col-1')).not.toBeNull();

			await store.addExistingRun('wf-1', 'col-1', 'run-c');

			expect(store.getInsights('col-1')).toBeNull();
		});

		it('drops cached insights when a run is removed (affected > 0)', async () => {
			await store.fetchCollectionDetail('wf-1', 'col-1');
			await store.generateInsights('wf-1', 'col-1');

			await store.removeRun('wf-1', 'col-1', 'run-a');

			expect(store.getInsights('col-1')).toBeNull();
			expect(store.getDetail('col-1')?.runs.map((r) => r.testRunId)).toEqual(['run-b']);
		});

		it('preserves cached insights on a no-op remove', async () => {
			await store.generateInsights('wf-1', 'col-1');
			removeRunFromCollection.mockResolvedValueOnce({ success: true, affected: 0 });

			await store.removeRun('wf-1', 'col-1', 'run-z');

			expect(store.getInsights('col-1')).not.toBeNull();
		});
	});

	describe('polling lifecycle', () => {
		it('arms a poll when detail has in-flight runs', async () => {
			getCollection.mockResolvedValueOnce(RUNNING_DETAIL);
			await store.fetchCollectionDetail('wf-1', 'col-1');

			// Second tick: still running.
			getCollection.mockResolvedValueOnce(RUNNING_DETAIL);
			await vi.advanceTimersByTimeAsync(3000);
			expect(getCollection).toHaveBeenCalledTimes(2);

			// Third tick: terminal — should drop the timer + bust insights.
			getCollection.mockResolvedValueOnce(COMPLETED_DETAIL);
			await vi.advanceTimersByTimeAsync(3000);
			expect(getCollection).toHaveBeenCalledTimes(3);

			// No further ticks.
			await vi.advanceTimersByTimeAsync(10000);
			expect(getCollection).toHaveBeenCalledTimes(3);
		});

		it('does not arm a poll when detail has no in-flight runs', async () => {
			await store.fetchCollectionDetail('wf-1', 'col-1');

			await vi.advanceTimersByTimeAsync(10000);
			// Only the initial fetch, no polling ticks.
			expect(getCollection).toHaveBeenCalledTimes(1);
		});

		it('stops polling on cleanup', async () => {
			getCollection.mockResolvedValue(RUNNING_DETAIL);
			await store.fetchCollectionDetail('wf-1', 'col-1');
			await flushPromises();

			store.cleanupPolling();

			await vi.advanceTimersByTimeAsync(10000);
			// Only the initial fetch; the armed timer was cleared before firing.
			expect(getCollection).toHaveBeenCalledTimes(1);
		});

		it('does not double-arm when startPolling is called twice', async () => {
			getCollection.mockResolvedValue(RUNNING_DETAIL);
			store.startPolling('wf-1', 'col-1');
			store.startPolling('wf-1', 'col-1');

			await vi.advanceTimersByTimeAsync(3000);
			expect(getCollection).toHaveBeenCalledTimes(1);
		});
	});
});
