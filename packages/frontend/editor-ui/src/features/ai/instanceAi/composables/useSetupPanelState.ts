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
	const derivation = useWorkflowSetupItems(options.workflowId);

	/** Mirrors the artifact preview's edit lock (see `InstanceAiWorkflowPreview`). */
	const isAgentEditing = computed(() => {
		const id = toValue(options.workflowId);
		if (!id) return false;
		return thread.messages.some(
			(message) => message.agentTree && isAgentEditingWorkflow(message.agentTree, id),
		);
	});

	const eventItems = computed<InstanceAiSetupItem[]>(() => {
		const id = toValue(options.workflowId);
		return id ? (thread.setupItemsByWorkflowId[id] ?? []) : [];
	});

	/**
	 * Reconciliation: while the agent edits the workflow, its events are the
	 * row source (the workflow document lags behind the agent's changes); at
	 * rest the derivation from the document is ground truth. Events also
	 * cover the document not being hydrated yet, e.g. a refreshed thread
	 * before the artifact canvas loads.
	 */
	const rowSource = computed<'events' | 'derived'>(() =>
		!isAgentEditing.value && derivation.isWorkflowAvailable.value ? 'derived' : 'events',
	);

	const rows = computed<SetupPanelRow[]>(() => {
		const items = rowSource.value === 'derived' ? derivation.derivedItems.value : eventItems.value;
		return items.map((item) => ({ item, isDone: derivation.isItemDone(item) }));
	});

	return { rows, rowSource, isAgentEditing };
}
