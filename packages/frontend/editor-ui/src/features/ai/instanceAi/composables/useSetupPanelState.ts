import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { InstanceAiAgentNode, InstanceAiSetupItem } from '@n8n/api-types';
import { useWorkflowSetupItems } from '@/features/setupPanel/composables/useWorkflowSetupItems';
import { isAgentEditingWorkflow } from '../canvasPreview.utils';

export interface SetupPanelRow {
	item: InstanceAiSetupItem;
	/** Derived, never stored: usable/bound credential or parameters filled. */
	isDone: boolean;
}

/**
 * Thread state the setup panel reads. Structurally satisfied by `useThread()`;
 * kept narrow so tests can pass a plain reactive stub.
 */
export interface SetupPanelThreadSource {
	messages: ReadonlyArray<{ agentTree?: InstanceAiAgentNode }>;
	setupItemsByWorkflowId: Record<string, InstanceAiSetupItem[]>;
}

/**
 * Row state for the Instance AI setup panel: merges the thread's durable
 * `setup-items` events with the derivation from the workflow document into a
 * single row list, reconciling which feed is authoritative.
 */
export function useSetupPanelState(options: {
	thread: SetupPanelThreadSource;
	/** The thread's active artifact workflow — latest artifact wins (canvas tab state). */
	workflowId: MaybeRefOrGetter<string | undefined>;
}) {
	const { thread } = options;

	/**
	 * Detects an in-flight agent edit of this workflow. Blocks nothing — it
	 * only picks the row source (agent events over deriving from a mid-mutation
	 * workflow) and pauses the derivation's refetches until the edit settles.
	 */
	const isAgentBuilding = computed(() => {
		const id = toValue(options.workflowId);
		if (!id) return false;
		return thread.messages.some(
			(message) => message.agentTree && isAgentEditingWorkflow(message.agentTree, id),
		);
	});

	const derivation = useWorkflowSetupItems(options.workflowId, {
		paused: () => isAgentBuilding.value,
	});

	const eventItems = computed<InstanceAiSetupItem[]>(() => {
		const id = toValue(options.workflowId);
		// hasOwn: an id like 'constructor' must read as absent, not resolve to a
		// prototype member. (The map itself is rebuilt per recompute, so its
		// reactivity dep is the containing computed, not the key.)
		if (!id || !Object.hasOwn(thread.setupItemsByWorkflowId, id)) return [];
		return thread.setupItemsByWorkflowId[id];
	});

	/**
	 * Reconciliation: while the agent edits the workflow, its events are the
	 * row source (the workflow document lags behind the agent's changes); at
	 * rest the derivation is ground truth — from the live canvas store when a
	 * host has one hydrated, else from the saved workflow the derivation
	 * fetches itself. Events still cover that fetch being in flight, e.g.
	 * right after a thread refresh.
	 */
	const rowSource = computed<'events' | 'derived'>(() =>
		!isAgentBuilding.value && derivation.isWorkflowAvailable.value ? 'derived' : 'events',
	);

	const rows = computed<SetupPanelRow[]>(() => {
		if (rowSource.value === 'events') {
			return eventItems.value.map((item) => ({ item, isDone: derivation.isItemDone(item) }));
		}
		const derived = derivation.derivedItems.value;
		const derivedIds = new Set(derived.map((item) => item.id));
		// Parameter rows the agent announced that settled before this session's
		// derivation ever saw them raise issues (e.g. resolved mid-build, then a
		// refresh) stay visible as done — parity with credential rows, which
		// persist because they derive from workflow structure rather than issue
		// state. A row whose node no longer exists stays dropped: `isItemDone`
		// is false for it.
		const settledEventItems = eventItems.value.filter(
			(item) =>
				item.kind === 'parameters' && !derivedIds.has(item.id) && derivation.isItemDone(item),
		);
		return [...derived, ...settledEventItems].map((item) => ({
			item,
			isDone: derivation.isItemDone(item),
		}));
	});

	return { rows, rowSource, isAgentBuilding };
}
