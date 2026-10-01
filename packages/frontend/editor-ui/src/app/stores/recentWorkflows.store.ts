import { isRecord } from '@n8n/utils/is-record';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

import type { IWorkflowDb } from '@/Interface';
import { LOCAL_STORAGE_RECENT_WORKFLOWS } from '@/app/constants/localStorage';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const STORAGE_VERSION = 2;
const MAX_RECENT_WORKFLOWS_PER_BUCKET = 50;
const MAX_RECENT_WORKFLOWS_TO_RESOLVE = 50;
const MAX_RECENT_WORKFLOWS_TO_RETURN = 10;

export interface RecentWorkflowOpen {
	id: string;
	openedAt: number;
}

interface RecentWorkflowsStorage {
	version: typeof STORAGE_VERSION;
	byProject: Record<string, RecentWorkflowOpen[]>;
	unscoped: RecentWorkflowOpen[];
}

function emptyStorage(): RecentWorkflowsStorage {
	return {
		version: STORAGE_VERSION,
		byProject: {},
		unscoped: [],
	};
}

function isRecentWorkflowOpen(value: unknown): value is RecentWorkflowOpen {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		value.id.trim() !== '' &&
		typeof value.openedAt === 'number' &&
		Number.isFinite(value.openedAt)
	);
}

function normalizeWorkflowOpens(
	value: unknown,
	limit = MAX_RECENT_WORKFLOWS_PER_BUCKET,
): RecentWorkflowOpen[] {
	if (!Array.isArray(value)) return [];

	const byId = new Map<string, RecentWorkflowOpen>();
	for (const entry of value) {
		if (!isRecentWorkflowOpen(entry)) continue;

		const normalized = { id: entry.id.trim(), openedAt: entry.openedAt };
		const current = byId.get(normalized.id);
		if (!current || normalized.openedAt > current.openedAt) {
			byId.set(normalized.id, normalized);
		}
	}

	return [...byId.values()].sort((a, b) => b.openedAt - a.openedAt).slice(0, limit);
}

function normalizeStorage(value: unknown): RecentWorkflowsStorage {
	if (Array.isArray(value)) {
		return {
			...emptyStorage(),
			unscoped: normalizeWorkflowOpens(value),
		};
	}

	if (!isRecord(value) || value.version !== STORAGE_VERSION) return emptyStorage();

	const byProject: Record<string, RecentWorkflowOpen[]> = {};
	if (isRecord(value.byProject)) {
		for (const [projectId, entries] of Object.entries(value.byProject)) {
			if (projectId.trim() === '') continue;
			byProject[projectId] = normalizeWorkflowOpens(entries);
		}
	}

	return {
		version: STORAGE_VERSION,
		byProject,
		unscoped: normalizeWorkflowOpens(value.unscoped),
	};
}

export const useRecentWorkflowsStore = defineStore('recentWorkflows', () => {
	const workflowsListStore = useWorkflowsListStore();
	const storage = useLocalStorage<RecentWorkflowsStorage>(
		LOCAL_STORAGE_RECENT_WORKFLOWS,
		emptyStorage(),
		{ deep: true, flush: 'sync' },
	);

	storage.value = normalizeStorage(storage.value);

	const globalRecentWorkflowOpens = computed(() =>
		normalizeWorkflowOpens(
			[...Object.values(storage.value.byProject).flat(), ...storage.value.unscoped],
			Number.POSITIVE_INFINITY,
		),
	);

	function getRecentWorkflowOpensForProject(projectId: string): RecentWorkflowOpen[] {
		return storage.value.byProject[projectId] ?? [];
	}

	function registerWorkflowOpen(workflowId: string, projectId?: string): void {
		const normalizedWorkflowId = workflowId.trim();
		if (normalizedWorkflowId === '') return;

		const previousOpenedAt = globalRecentWorkflowOpens.value.find(
			({ id }) => id === normalizedWorkflowId,
		)?.openedAt;
		const entry = {
			id: normalizedWorkflowId,
			openedAt: Math.max(Date.now(), (previousOpenedAt ?? 0) + 1),
		};
		const normalizedProjectId = projectId?.trim();

		if (normalizedProjectId) {
			storage.value = {
				...storage.value,
				byProject: {
					...storage.value.byProject,
					[normalizedProjectId]: normalizeWorkflowOpens([
						entry,
						...(storage.value.byProject[normalizedProjectId] ?? []),
					]),
				},
			};
			return;
		}

		storage.value = {
			...storage.value,
			unscoped: normalizeWorkflowOpens([entry, ...storage.value.unscoped]),
		};
	}

	async function resolveRecentWorkflows(
		projectId: string,
		excludedWorkflowIds: readonly string[] = [],
	): Promise<IWorkflowDb[]> {
		const normalizedProjectId = projectId.trim();
		if (normalizedProjectId === '') return [];

		const candidates = normalizeWorkflowOpens(
			[...(storage.value.byProject[normalizedProjectId] ?? []), ...storage.value.unscoped],
			MAX_RECENT_WORKFLOWS_TO_RESOLVE,
		);
		if (candidates.length === 0) return [];
		const projectEntriesAtRequest = new Map(
			(storage.value.byProject[normalizedProjectId] ?? []).map(({ id, openedAt }) => [
				id,
				openedAt,
			]),
		);

		const workflows = await workflowsListStore.searchWorkflows({
			projectId: normalizedProjectId,
			ids: candidates.map(({ id }) => id),
			isArchived: false,
			select: ['id', 'name', 'updatedAt'],
			options: {
				take: MAX_RECENT_WORKFLOWS_TO_RESOLVE,
				skip: 0,
				includeScopes: false,
			},
		});

		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const resolvedEntries = candidates.filter(({ id }) => workflowsById.has(id));
		const candidateIds = new Set(candidates.map(({ id }) => id));
		const preservedProjectEntries = (storage.value.byProject[normalizedProjectId] ?? []).filter(
			({ id, openedAt }) => !candidateIds.has(id) || projectEntriesAtRequest.get(id) !== openedAt,
		);
		storage.value = {
			...storage.value,
			byProject: {
				...storage.value.byProject,
				[normalizedProjectId]: normalizeWorkflowOpens([
					...resolvedEntries,
					...preservedProjectEntries,
				]),
			},
		};

		const excludedIds = new Set(excludedWorkflowIds);
		return candidates
			.filter(({ id }) => !excludedIds.has(id))
			.map(({ id }) => workflowsById.get(id))
			.filter((workflow): workflow is IWorkflowDb => workflow !== undefined)
			.slice(0, MAX_RECENT_WORKFLOWS_TO_RETURN);
	}

	return {
		globalRecentWorkflowOpens,
		getRecentWorkflowOpensForProject,
		registerWorkflowOpen,
		resolveRecentWorkflows,
	};
});
