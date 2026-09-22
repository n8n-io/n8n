import type { IWorkflowDb } from '@/Interface';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssistantMentionItem, MentionSourceProvider } from '../assistantAtMentions.types';
import { buildWorkflowMentionItem } from '../utils/buildMentionItems';
import {
	createArtifactMentionSourceProvider,
	createWorkflowMentionSourceProvider,
	useAssistantMentionSources,
} from './useAssistantMentionSources';
import { useArtifactMentionIndex } from './useArtifactMentionIndex';

function makeWorkflow(id: string, name: string): IWorkflowDb {
	return {
		id,
		name,
		active: false,
		isArchived: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		activeVersionId: null,
	};
}

function provider(
	id: MentionSourceProvider['id'],
	items: AssistantMentionItem[],
): MentionSourceProvider {
	return {
		id,
		browse: async () => items,
		search: async () => items,
	};
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});
	return { promise, resolve };
}

describe('createWorkflowMentionSourceProvider', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('resolves recent workflows for the active project and excludes artifacts', async () => {
		const recentWorkflowsStore = useRecentWorkflowsStore();
		vi.spyOn(recentWorkflowsStore, 'resolveRecentWorkflows').mockResolvedValue([
			makeWorkflow('recent', 'Recent workflow'),
		]);
		const source = createWorkflowMentionSourceProvider({
			projectId: ref('project-1'),
			artifactWorkflowIds: ref(['artifact']),
		});

		const items = await source.browse();

		expect(recentWorkflowsStore.resolveRecentWorkflows).toHaveBeenCalledWith('project-1', [
			'artifact',
		]);
		expect(items[0]).toMatchObject({
			key: 'workflow:recent:recent',
			source: 'workflows',
		});
	});

	it('searches bounded workflow metadata without scope enrichment', async () => {
		const workflowsListStore = useWorkflowsListStore();
		vi.spyOn(workflowsListStore, 'searchWorkflows').mockResolvedValue([
			makeWorkflow('artifact', 'Artifact workflow'),
			makeWorkflow('result', 'Order workflow'),
		]);
		const source = createWorkflowMentionSourceProvider({
			projectId: 'project-1',
			artifactWorkflowIds: ['artifact'],
		});

		const results = await source.search(' order ');

		expect(workflowsListStore.searchWorkflows).toHaveBeenCalledWith({
			projectId: 'project-1',
			query: 'order',
			isArchived: false,
			select: ['id', 'name', 'description', 'updatedAt'],
			options: {
				take: 10,
				skip: 0,
				sortBy: 'updatedAt:desc',
				includeScopes: false,
			},
		});
		expect(results.map(({ workflowId }) => workflowId)).toEqual(['artifact', 'result']);
	});

	it('does not issue unscoped browse or search requests', async () => {
		const recentWorkflowsStore = useRecentWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const recentSpy = vi.spyOn(recentWorkflowsStore, 'resolveRecentWorkflows');
		const searchSpy = vi.spyOn(workflowsListStore, 'searchWorkflows');
		const source = createWorkflowMentionSourceProvider({
			projectId: ' ',
			artifactWorkflowIds: [],
		});

		expect(await source.browse()).toEqual([]);
		expect(await source.search('orders')).toEqual([]);
		expect(recentSpy).not.toHaveBeenCalled();
		expect(searchSpy).not.toHaveBeenCalled();
	});
});

describe('useAssistantMentionSources', () => {
	it('limits each browse section to ten items', async () => {
		const items = Array.from({ length: 15 }, (_, index) =>
			buildWorkflowMentionItem(makeWorkflow(`${index}`, `Workflow ${index}`), 'artifacts'),
		);
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([provider('artifacts', items)]);
		});

		await sources.browse();

		expect(sources.browseSections.value).toEqual([{ id: 'artifacts', items: items.slice(0, 10) }]);
		scope.stop();
	});

	it('combines, ranks, de-duplicates, and limits flat search results', async () => {
		const artifact = buildWorkflowMentionItem(makeWorkflow('duplicate', 'Orders'), 'artifacts');
		const workflows = [
			buildWorkflowMentionItem(makeWorkflow('duplicate', 'Orders'), 'workflows'),
			...Array.from({ length: 15 }, (_, index) =>
				buildWorkflowMentionItem(makeWorkflow(`workflow-${index}`, `Orders ${index}`), 'workflows'),
			),
		];
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([
				provider('artifacts', [artifact]),
				provider('workflows', workflows),
			]);
		});

		await sources.search('orders');

		expect(sources.searchResults.value).toHaveLength(10);
		expect(sources.searchResults.value[0]).toBe(artifact);
		expect(sources.searchResults.value.filter(({ key }) => key === artifact.key)).toHaveLength(1);
		scope.stop();
	});

	it('ignores an older search response after a newer query completes', async () => {
		const older = deferred<AssistantMentionItem[]>();
		const newerItem = buildWorkflowMentionItem(makeWorkflow('newer', 'Newer'), 'workflows');
		const source: MentionSourceProvider = {
			id: 'workflows',
			browse: async () => [],
			search: vi
				.fn<(query: string) => Promise<AssistantMentionItem[]>>()
				.mockReturnValueOnce(older.promise)
				.mockResolvedValueOnce([newerItem]),
		};
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([source]);
		});

		const staleSearch = sources.search('old');
		await sources.search('newer');
		expect(sources.searchResults.value).toEqual([newerItem]);
		older.resolve([buildWorkflowMentionItem(makeWorkflow('old', 'Old'), 'workflows')]);
		await staleSearch;
		expect(sources.searchResults.value).toEqual([newerItem]);
		scope.stop();
	});

	it('invalidates an in-flight search when the query is cleared', async () => {
		const response = deferred<AssistantMentionItem[]>();
		const source: MentionSourceProvider = {
			id: 'workflows',
			browse: async () => [],
			search: async () => await response.promise,
		};
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([source]);
		});

		const pending = sources.search('orders');
		await sources.search('');
		response.resolve([buildWorkflowMentionItem(makeWorkflow('old', 'Orders'), 'workflows')]);
		await pending;

		expect(sources.searchResults.value).toEqual([]);
		scope.stop();
	});

	it('keeps successful provider results when another provider fails', async () => {
		const item = buildWorkflowMentionItem(makeWorkflow('orders', 'Orders'), 'workflows');
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([
				{
					id: 'artifacts',
					browse: async () => [],
					search: async () => await Promise.reject(new Error('Unavailable')),
				},
				provider('workflows', [item]),
			]);
		});

		await sources.search('orders');

		expect(sources.searchResults.value).toEqual([item]);
		expect(sources.providerErrors.value.get('artifacts')).toBeInstanceOf(Error);
		scope.stop();
	});

	it('refreshes ready artifact results as compact indexes load', async () => {
		const artifacts = [{ id: '1', name: 'Workflow 1' }];
		const fetchResponse = deferred<IWorkflowDb>();
		const indexScope = effectScope();
		let artifactIndex!: ReturnType<typeof useArtifactMentionIndex>;
		indexScope.run(() => {
			artifactIndex = useArtifactMentionIndex({
				artifacts,
				fetchWorkflow: async () => await fetchResponse.promise,
				getActiveWorkflow: () => undefined,
			});
		});
		const artifactProvider = createArtifactMentionSourceProvider({ artifacts, artifactIndex });
		const workflowItem = buildWorkflowMentionItem(
			makeWorkflow('workflow-result', 'Order search'),
			'workflows',
		);
		const sourceScope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		sourceScope.run(() => {
			sources = useAssistantMentionSources([
				artifactProvider,
				provider('workflows', [workflowItem]),
			]);
		});

		await sources.search('order');
		expect(sources.searchResults.value).toEqual([workflowItem]);

		fetchResponse.resolve(makeWorkflow('1', 'Order artifact'));
		await vi.waitFor(() =>
			expect(sources.searchResults.value.map(({ label }) => label)).toEqual([
				'Order artifact',
				'Order search',
			]),
		);

		sourceScope.stop();
		indexScope.stop();
	});

	it('refreshes only the provider whose revision changed', async () => {
		const revision = ref(0);
		const first = buildWorkflowMentionItem(makeWorkflow('first', 'Orders first'), 'artifacts');
		const second = buildWorkflowMentionItem(makeWorkflow('second', 'Orders second'), 'artifacts');
		let currentItems = [first];
		const revisedProvider: MentionSourceProvider = {
			id: 'artifacts',
			revision,
			browse: async () => [],
			search: vi.fn(async () => currentItems),
		};
		const stableProvider = provider('workflows', []);
		const stableSearch = vi.spyOn(stableProvider, 'search');
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([revisedProvider, stableProvider]);
		});

		await sources.search('orders');
		currentItems = [first, second];
		revision.value++;
		await nextTick();
		await vi.waitFor(() => expect(sources.searchResults.value).toEqual([first, second]));

		expect(stableSearch).toHaveBeenCalledTimes(1);
		scope.stop();
	});

	it('ignores a provider response superseded by its revision refresh', async () => {
		const revision = ref(0);
		const staleResponse = deferred<AssistantMentionItem[]>();
		const freshItem = buildWorkflowMentionItem(makeWorkflow('fresh', 'Orders fresh'), 'artifacts');
		const staleItem = buildWorkflowMentionItem(makeWorkflow('stale', 'Orders stale'), 'artifacts');
		const revisedProvider: MentionSourceProvider = {
			id: 'artifacts',
			revision,
			browse: async () => [],
			search: vi
				.fn<(query: string) => Promise<AssistantMentionItem[]>>()
				.mockReturnValueOnce(staleResponse.promise)
				.mockResolvedValueOnce([freshItem]),
		};
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			sources = useAssistantMentionSources([revisedProvider]);
		});

		const pending = sources.search('orders');
		revision.value++;
		await nextTick();
		await vi.waitFor(() => expect(sources.searchResults.value).toEqual([freshItem]));

		staleResponse.resolve([staleItem]);
		await pending;
		expect(sources.searchResults.value).toEqual([freshItem]);
		scope.stop();
	});

	it('refreshes browse roots when unloaded artifacts are added or removed', async () => {
		const artifacts = ref([{ id: '1', name: 'Workflow 1' }]);
		const scope = effectScope();
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			const artifactIndex = useArtifactMentionIndex({
				artifacts,
				fetchWorkflow: async (workflowId) => makeWorkflow(workflowId, `Workflow ${workflowId}`),
				getActiveWorkflow: () => undefined,
			});
			sources = useAssistantMentionSources([
				createArtifactMentionSourceProvider({ artifacts, artifactIndex }),
			]);
		});

		await sources.browse();
		artifacts.value = [{ id: '1', name: 'Renamed workflow' }];
		await vi.waitFor(() =>
			expect(sources.browseSections.value[0].items[0].label).toBe('Renamed workflow'),
		);

		artifacts.value = [...artifacts.value, { id: '2', name: 'Workflow 2' }];
		await vi.waitFor(() => expect(sources.browseSections.value[0].items).toHaveLength(2));

		artifacts.value = [{ id: '2', name: 'Workflow 2' }];
		await vi.waitFor(() =>
			expect(sources.browseSections.value[0].items.map(({ workflowId }) => workflowId)).toEqual([
				'2',
			]),
		);
		scope.stop();
	});

	it('refreshes browse children when an artifact index becomes ready', async () => {
		const artifacts = [{ id: '1', name: 'Workflow 1' }];
		const fetchResponse = deferred<IWorkflowDb>();
		const scope = effectScope();
		let artifactIndex!: ReturnType<typeof useArtifactMentionIndex>;
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		scope.run(() => {
			artifactIndex = useArtifactMentionIndex({
				artifacts,
				fetchWorkflow: async () => await fetchResponse.promise,
				getActiveWorkflow: () => undefined,
			});
			sources = useAssistantMentionSources([
				createArtifactMentionSourceProvider({ artifacts, artifactIndex }),
			]);
		});

		await sources.browse();
		expect(sources.browseSections.value[0].items[0].children).toBeUndefined();

		const loading = artifactIndex.load('1');
		fetchResponse.resolve(makeWorkflow('1', 'Workflow 1'));
		await loading;
		await vi.waitFor(() =>
			expect(sources.browseSections.value[0].items[0].children).toHaveLength(0),
		);
		scope.stop();
	});

	it('does not recursively refresh a ready active artifact', async () => {
		const artifacts = [{ id: '1', name: 'Active workflow' }];
		const activeWorkflow = {
			id: '1',
			name: 'Active workflow',
			versionId: 'version-1',
			nodes: [],
		};
		const scope = effectScope();
		let artifactIndex!: ReturnType<typeof useArtifactMentionIndex>;
		let sources!: ReturnType<typeof useAssistantMentionSources>;
		let artifactProvider!: MentionSourceProvider;
		scope.run(() => {
			artifactIndex = useArtifactMentionIndex({
				artifacts,
				activeWorkflowId: '1',
				fetchWorkflow: async () => makeWorkflow('1', 'Saved workflow'),
				getActiveWorkflow: () => activeWorkflow,
			});
			artifactProvider = createArtifactMentionSourceProvider({ artifacts, artifactIndex });
			sources = useAssistantMentionSources([artifactProvider]);
		});
		const searchSpy = vi.spyOn(artifactProvider, 'search');

		await sources.search('active');
		await nextTick();

		expect(searchSpy).toHaveBeenCalledTimes(1);
		scope.stop();
	});
});
