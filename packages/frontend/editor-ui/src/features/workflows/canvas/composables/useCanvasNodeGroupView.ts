import { getCurrentScope, onScopeDispose, ref, type InjectionKey } from 'vue';
import { jsonParse } from 'n8n-workflow';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { CHANGE_ACTION } from '@/app/stores/workflowDocument/types';
import { LOCAL_STORAGE_CANVAS_GROUP_EXPANDED } from '@/app/constants/localStorage';
import { isStringArrayRecord } from '@/app/utils/objectUtils';

export interface UseCanvasNodeGroupViewDeps {
	workflowId: () => string;
	getCurrentGroupIds: () => string[];
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
	isGroupingEnabled?: () => boolean;
}

export type CanvasNodeGroupView = ReturnType<typeof useCanvasNodeGroupView>;

export const NodeGroupViewKey: InjectionKey<CanvasNodeGroupView> = Symbol('nodeGroupView');

// workflowId -> ordered expanded group ids.
type ExpandedGroupStore = Record<string, string[]>;

function readStore(): ExpandedGroupStore {
	const raw = localStorage.getItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED) ?? '';
	const parsed = jsonParse<unknown>(raw, { fallbackValue: {} });
	return isStringArrayRecord(parsed) ? parsed : {};
}

function writeStore(store: ExpandedGroupStore) {
	try {
		localStorage.setItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED, JSON.stringify(store));
	} catch {
		// Failure is not critical, as collapse state is a view preference
	}
}

/**
 * Canvas view-state for group collapse/expand. Lives separately from the
 * workflow document store because collapse is not workflow data — it does
 * not dirty the document, does not enter undo, and is not serialized.
 *
 * The expanded ids are persisted to localStorage per workflow as an ordered
 * array, ordered by expansion recency (most recently expanded last), so a
 * reload restores the groups the user had open.
 */
export function useCanvasNodeGroupView(deps: UseCanvasNodeGroupViewDeps) {
	const expandedIds = ref<Set<string>>(new Set());

	const isGroupingEnabled = () => deps.isGroupingEnabled?.() ?? true;

	function persist() {
		writeStore({ ...readStore(), [deps.workflowId()]: Array.from(expandedIds.value) });
	}

	// Load the persisted ids, dropping any whose group no longer exists.
	function restore(presentIds: Set<string>) {
		const stored = readStore()[deps.workflowId()] ?? [];
		expandedIds.value = new Set(stored.filter((id) => presentIds.has(id)));
		persist();
	}

	function setExpanded(id: string, value: boolean) {
		if (value) {
			// Delete-then-add moves the id to the end so order tracks recency.
			expandedIds.value.delete(id);
			expandedIds.value.add(id);
		} else {
			expandedIds.value.delete(id);
		}
		persist();
	}

	const isGroupCollapsed = (id: string) => isGroupingEnabled() && !expandedIds.value.has(id);

	function toggleCollapsed(id: string) {
		setExpanded(id, isGroupCollapsed(id));
	}

	// Seed from groups already loaded (the SET event can fire before we subscribe).
	restore(new Set(deps.getCurrentGroupIds()));

	// SET restores persisted state; ADD expands the new group; DELETE prunes it.
	const subscription = deps.onNodeGroupsChange((event) => {
		if (event.action === CHANGE_ACTION.SET) {
			restore(new Set(event.payload.groups.map((group) => group.id)));
		} else if (event.action === CHANGE_ACTION.ADD) {
			setExpanded(event.payload.group.id, true);
		} else if (event.action === CHANGE_ACTION.DELETE) {
			setExpanded(event.payload.id, false);
		}
	});

	// Release the subscription with the surrounding scope so the handler
	// doesn't outlive its owner.
	if (getCurrentScope()) {
		onScopeDispose(() => subscription.off());
	}

	return {
		isGroupCollapsed,
		toggleCollapsed,
	};
}
