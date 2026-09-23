import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type {
	AssistantMentionBrowseSection,
	AssistantMentionItem,
	MentionSourceProvider,
	WorkflowArtifactReference,
} from '../assistantAtMentions.types';
import {
	buildArtifactBrowseItems,
	buildArtifactSearchItems,
	buildWorkflowMentionItem,
	MAX_MENTION_RESULTS,
} from '../utils/buildMentionItems';
import { searchMentionItems } from '../utils/searchMentionItems';
import type { useArtifactMentionIndex } from './useArtifactMentionIndex';

type ArtifactMentionIndex = ReturnType<typeof useArtifactMentionIndex>;
const MAX_WORKFLOW_BROWSE_CANDIDATES = 50;

export function createArtifactMentionSourceProvider(options: {
	artifacts: MaybeRefOrGetter<readonly WorkflowArtifactReference[]>;
	artifactIndex: ArtifactMentionIndex;
}): MentionSourceProvider {
	return {
		id: 'artifacts',
		revision: options.artifactIndex.revision,
		async browse() {
			return buildArtifactBrowseItems(toValue(options.artifacts), options.artifactIndex.getIndex);
		},
		async search(query) {
			void options.artifactIndex.loadAll();
			return searchMentionItems(
				buildArtifactSearchItems(toValue(options.artifacts), options.artifactIndex.getIndex),
				query,
				MAX_MENTION_RESULTS,
			);
		},
	};
}

export function createWorkflowMentionSourceProvider(options: {
	projectId: MaybeRefOrGetter<string | undefined>;
	artifactWorkflowIds: MaybeRefOrGetter<readonly string[]>;
}): MentionSourceProvider {
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();

	return {
		id: 'workflows',
		async browse() {
			const projectId = toValue(options.projectId)?.trim();
			if (!projectId) return [];

			const artifactWorkflowIds = toValue(options.artifactWorkflowIds);
			const recentWorkflows = await recentWorkflowsStore.resolveRecentWorkflows(
				projectId,
				artifactWorkflowIds,
			);
			if (recentWorkflows.length >= MAX_MENTION_RESULTS) {
				return recentWorkflows.map((workflow) => buildWorkflowMentionItem(workflow, 'workflows'));
			}

			const excludedIds = new Set([...artifactWorkflowIds, ...recentWorkflows.map(({ id }) => id)]);
			try {
				const backfillWorkflows = await workflowsListStore.searchWorkflows({
					projectId,
					isArchived: false,
					select: ['id', 'name', 'updatedAt'],
					options: {
						take: Math.min(MAX_MENTION_RESULTS + excludedIds.size, MAX_WORKFLOW_BROWSE_CANDIDATES),
						skip: 0,
						sortBy: 'updatedAt:desc',
						includeScopes: false,
					},
				});
				return [...recentWorkflows, ...backfillWorkflows.filter(({ id }) => !excludedIds.has(id))]
					.slice(0, MAX_MENTION_RESULTS)
					.map((workflow) => buildWorkflowMentionItem(workflow, 'workflows'));
			} catch (error) {
				if (recentWorkflows.length === 0) throw error;
				return recentWorkflows.map((workflow) => buildWorkflowMentionItem(workflow, 'workflows'));
			}
		},
		async search(query) {
			const projectId = toValue(options.projectId)?.trim();
			const normalizedQuery = query.trim();
			if (!projectId || !normalizedQuery) return [];

			const workflows = await workflowsListStore.searchWorkflows({
				projectId,
				query: normalizedQuery,
				isArchived: false,
				select: ['id', 'name', 'description', 'updatedAt'],
				options: {
					take: MAX_MENTION_RESULTS,
					skip: 0,
					sortBy: 'updatedAt:desc',
					includeScopes: false,
				},
			});
			return workflows.map((workflow) => buildWorkflowMentionItem(workflow, 'workflows'));
		},
	};
}

export function useAssistantMentionSources(providers: readonly MentionSourceProvider[]) {
	const browseSections = shallowRef<AssistantMentionBrowseSection[]>([]);
	const searchResults = shallowRef<AssistantMentionItem[]>([]);
	const providerErrors = shallowRef(new Map<MentionSourceProvider['id'], unknown>());
	const isBrowsing = ref(false);
	const isSearching = ref(false);
	const browseItemsByProvider = new Map<MentionSourceProvider['id'], AssistantMentionItem[]>();
	const searchItemsByProvider = new Map<MentionSourceProvider['id'], AssistantMentionItem[]>();
	const providerRequestGenerations = new Map<MentionSourceProvider['id'], number>();
	let requestGeneration = 0;
	let currentQuery = '';
	let currentMode: 'browse' | 'search' | undefined;
	let disposed = false;

	function updateBrowseSections(): void {
		browseSections.value = providers.map((provider) => ({
			id: provider.id,
			items: (browseItemsByProvider.get(provider.id) ?? []).slice(0, MAX_MENTION_RESULTS),
		}));
	}

	function updateSearchResults(query: string): void {
		searchResults.value = searchMentionItems(
			providers.flatMap((provider) => searchItemsByProvider.get(provider.id) ?? []),
			query,
			MAX_MENTION_RESULTS,
		);
	}

	function clearProviderError(providerId: MentionSourceProvider['id']): void {
		if (!providerErrors.value.has(providerId)) return;
		const nextErrors = new Map(providerErrors.value);
		nextErrors.delete(providerId);
		providerErrors.value = nextErrors;
	}

	function setProviderError(providerId: MentionSourceProvider['id'], error: unknown): void {
		providerErrors.value = new Map(providerErrors.value).set(providerId, error);
	}

	function nextProviderRequestGeneration(providerId: MentionSourceProvider['id']): number {
		const generation = (providerRequestGenerations.get(providerId) ?? 0) + 1;
		providerRequestGenerations.set(providerId, generation);
		return generation;
	}

	async function loadBrowseProvider(
		provider: MentionSourceProvider,
		generation: number,
	): Promise<void> {
		const providerGeneration = nextProviderRequestGeneration(provider.id);
		try {
			const items = await provider.browse();
			if (
				disposed ||
				generation !== requestGeneration ||
				providerGeneration !== providerRequestGenerations.get(provider.id)
			)
				return;
			browseItemsByProvider.set(provider.id, items);
			clearProviderError(provider.id);
			updateBrowseSections();
		} catch (error) {
			if (
				disposed ||
				generation !== requestGeneration ||
				providerGeneration !== providerRequestGenerations.get(provider.id)
			)
				return;
			browseItemsByProvider.set(provider.id, []);
			setProviderError(provider.id, error);
			updateBrowseSections();
		}
	}

	async function browse(): Promise<void> {
		const generation = ++requestGeneration;
		currentQuery = '';
		currentMode = 'browse';
		isSearching.value = false;
		isBrowsing.value = true;
		searchResults.value = [];
		providerErrors.value = new Map();
		browseItemsByProvider.clear();
		updateBrowseSections();
		await Promise.allSettled(
			providers.map(async (provider) => await loadBrowseProvider(provider, generation)),
		);
		if (!disposed && generation === requestGeneration) isBrowsing.value = false;
	}

	async function loadSearchProvider(
		provider: MentionSourceProvider,
		query: string,
		generation: number,
	): Promise<void> {
		const providerGeneration = nextProviderRequestGeneration(provider.id);
		try {
			const items = await provider.search(query);
			if (
				disposed ||
				generation !== requestGeneration ||
				query !== currentQuery ||
				providerGeneration !== providerRequestGenerations.get(provider.id)
			)
				return;
			searchItemsByProvider.set(provider.id, items);
			clearProviderError(provider.id);
			updateSearchResults(query);
		} catch (error) {
			if (
				disposed ||
				generation !== requestGeneration ||
				query !== currentQuery ||
				providerGeneration !== providerRequestGenerations.get(provider.id)
			)
				return;
			searchItemsByProvider.set(provider.id, []);
			setProviderError(provider.id, error);
			updateSearchResults(query);
		}
	}

	async function search(query: string): Promise<void> {
		const generation = ++requestGeneration;
		const normalizedQuery = query.trim();
		currentQuery = normalizedQuery;
		currentMode = normalizedQuery ? 'search' : undefined;
		isBrowsing.value = false;
		providerErrors.value = new Map();
		searchItemsByProvider.clear();
		searchResults.value = [];
		if (!normalizedQuery) {
			isSearching.value = false;
			return;
		}

		isSearching.value = true;
		await Promise.allSettled(
			providers.map(
				async (provider) => await loadSearchProvider(provider, normalizedQuery, generation),
			),
		);
		if (!disposed && generation === requestGeneration) isSearching.value = false;
	}

	for (const provider of providers) {
		if (!provider.revision) continue;
		watch(provider.revision, () => {
			if (disposed) return;
			if (currentMode === 'search' && currentQuery) {
				void loadSearchProvider(provider, currentQuery, requestGeneration);
			} else if (currentMode === 'browse') {
				void loadBrowseProvider(provider, requestGeneration);
			}
		});
	}

	function dispose(): void {
		disposed = true;
		requestGeneration++;
	}

	onScopeDispose(dispose);

	return {
		browseSections,
		searchResults,
		providerErrors,
		isBrowsing,
		isSearching,
		browse,
		search,
		dispose,
	};
}
