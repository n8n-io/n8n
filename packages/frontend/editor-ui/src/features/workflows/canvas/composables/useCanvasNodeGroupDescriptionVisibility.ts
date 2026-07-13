import { computed, inject, ref, type InjectionKey } from 'vue';
import { jsonParse } from 'n8n-workflow';
import { LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_VISIBLE } from '@/app/constants/localStorage';

// workflowId -> set of group ids with descriptions pinned visible
type DescriptionVisibilityStore = Record<string, string[]>;

function isStringArrayRecord(value: unknown): value is DescriptionVisibilityStore {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.values(value).every(
		(v) => Array.isArray(v) && v.every((id) => typeof id === 'string'),
	);
}

function readStore(): DescriptionVisibilityStore {
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_VISIBLE) ?? '';
		const parsed = jsonParse<unknown>(raw, { fallbackValue: {} });
		return isStringArrayRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(store: DescriptionVisibilityStore) {
	try {
		localStorage.setItem(LOCAL_STORAGE_CANVAS_GROUP_DESCRIPTION_VISIBLE, JSON.stringify(store));
	} catch {
		// Failure is not critical — description visibility is a view preference
	}
}

export type CanvasNodeGroupDescriptionVisibility = ReturnType<
	typeof useCanvasNodeGroupDescriptionVisibility
>;

export const NodeGroupDescriptionVisibilityKey: InjectionKey<CanvasNodeGroupDescriptionVisibility> =
	Symbol('nodeGroupDescriptionVisibility');

/**
 * Per-user, per-workflow tracking of which collapsed groups have their
 * description pinned visible. Stored in localStorage so it survives page
 * refreshes without being serialized with the workflow.
 */
export function useCanvasNodeGroupDescriptionVisibility(workflowId: () => string) {
	const visibleIds = ref<Set<string>>(new Set());

	function persist() {
		const store = readStore();
		store[workflowId()] = [...visibleIds.value];
		writeStore(store);
	}

	function restore(presentIds: Set<string>) {
		const stored = readStore()[workflowId()] ?? [];
		// Prune ids whose group no longer exists
		visibleIds.value = new Set(stored.filter((id) => presentIds.has(id)));
	}

	function isVisible(id: string): boolean {
		return visibleIds.value.has(id);
	}

	function setVisible(id: string, value: boolean) {
		const next = new Set(visibleIds.value);
		if (value) {
			next.add(id);
		} else {
			next.delete(id);
		}
		if (next.size === visibleIds.value.size && next.has(id) === visibleIds.value.has(id)) return;
		visibleIds.value = next;
		persist();
	}

	function toggleVisible(id: string) {
		setVisible(id, !isVisible(id));
	}

	function removeDeleted(id: string) {
		if (!visibleIds.value.has(id)) return;
		const next = new Set(visibleIds.value);
		next.delete(id);
		visibleIds.value = next;
		persist();
	}

	const allVisible = computed(() => visibleIds.value);

	return {
		visibleIds: allVisible,
		isVisible,
		setVisible,
		toggleVisible,
		restore,
		removeDeleted,
	};
}
