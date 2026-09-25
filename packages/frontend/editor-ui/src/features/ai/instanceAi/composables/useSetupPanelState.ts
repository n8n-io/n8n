import { computed, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type { InstanceAiAgentNode, InstanceAiSetupItem } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
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

function completeCredentialContext(
	item: InstanceAiSetupItem,
	fallback: InstanceAiSetupItem | undefined,
): InstanceAiSetupItem {
	if (
		item.kind !== 'credential' ||
		fallback?.kind !== 'credential' ||
		item.id !== fallback.id ||
		item.credentialType !== fallback.credentialType
	) {
		return item;
	}
	return {
		...item,
		nodeBindings: item.nodeBindings?.length ? item.nodeBindings : fallback.nodeBindings,
		setupHint: item.setupHint ?? fallback.setupHint,
		reason: item.reason ?? fallback.reason,
		preferNew: item.preferNew ?? fallback.preferNew,
		appDisplayName: item.appDisplayName ?? fallback.appDisplayName,
	};
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
	const isAwaitingFirstBuild = computed(() => {
		const id = toValue(options.workflowId);
		let pending = false;
		let latestCompletedAt: string | undefined;
		function visit(node: InstanceAiAgentNode) {
			for (const call of node.toolCalls) {
				if (!isRecord(call.result) || call.result.success !== true || call.result.workflowId !== id)
					continue;
				const earlySetup =
					call.toolName === 'credentials' &&
					call.args.action === 'setup' &&
					call.result.preBuild === true;
				if (!earlySetup && !['build-workflow', 'submit-workflow'].includes(call.toolName)) continue;
				if (latestCompletedAt && call.completedAt && call.completedAt < latestCompletedAt) continue;
				pending = earlySetup;
				latestCompletedAt = call.completedAt;
			}
			for (const child of node.children) visit(child);
		}
		for (const message of thread.messages) {
			if (message.agentTree) visit(message.agentTree);
		}
		return pending;
	});
	const credentialContext = shallowReactive(new Map<string, InstanceAiSetupItem>());
	watch(
		[() => toValue(options.workflowId), eventItems],
		([id, items], [previousId]) => {
			if (id !== previousId) credentialContext.clear();
			// Later snapshots can omit the recipe while the workflow still needs the credential.
			for (const item of items) {
				if (item.kind === 'credential') {
					credentialContext.set(
						item.id,
						completeCredentialContext(item, credentialContext.get(item.id)),
					);
				}
			}
		},
		{ immediate: true, flush: 'sync' },
	);

	watch(
		[eventItems, isAgentBuilding],
		([items, building]) => {
			// The SDK saves resolved credentials before announcing setup, while its tool is still active.
			if (building && items.length > 0) void derivation.refreshWorkflow({ force: true });
		},
		{ immediate: true, flush: 'sync' },
	);

	/**
	 * Reconciliation: while the agent edits the workflow, its events are the
	 * row source (the workflow document lags behind the agent's changes); at
	 * rest the derivation is ground truth — from the live canvas store when a
	 * host has one hydrated, else from the saved workflow the derivation
	 * fetches itself. Events still cover that fetch being in flight, e.g.
	 * right after a thread refresh.
	 */
	const rowSource = computed<'events' | 'derived'>(() =>
		!isAgentBuilding.value &&
		derivation.isWorkflowAvailable.value &&
		(!isAwaitingFirstBuild.value ||
			derivation.hasWorkflowNodes.value ||
			eventItems.value.length === 0)
			? 'derived'
			: 'events',
	);

	const rows = computed<SetupPanelRow[]>(() => {
		if (rowSource.value === 'events') {
			// Resolve bindings without remembering temporary parameter issues during a build.
			const derivedById = new Map(
				derivation.derivedCredentialItems.value.map((item) => [item.id, item]),
			);
			const announcedIds = new Set(eventItems.value.map((item) => item.id));
			const stillRequired = derivation.derivedCredentialItems.value.filter(
				(item) => credentialContext.has(item.id) && !announcedIds.has(item.id),
			);
			return [...eventItems.value, ...stillRequired].map((event) => {
				const item = completeCredentialContext(
					completeCredentialContext(event, derivedById.get(event.id)),
					credentialContext.get(event.id),
				);
				return { item, isDone: derivation.isItemDone(item) };
			});
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
		return [...derived, ...settledEventItems].map((derivedItem) => {
			const item = completeCredentialContext(derivedItem, credentialContext.get(derivedItem.id));
			return { item, isDone: derivation.isItemDone(item) };
		});
	});

	return {
		credentialsAvailable: derivation.credentialsAvailable,
		savedWorkflowChecksum: derivation.savedWorkflowChecksum,
		isCheckingOAuthCredentials: derivation.isCheckingOAuthCredentials,
		isRefreshingWorkflow: derivation.isRefreshingWorkflow,
		rows,
		rowSource,
		isAgentBuilding,
		isAwaitingFirstBuild,
		getNodeByName: derivation.getNodeByName,
		workflowProjectId: derivation.workflowProjectId,
		refreshWorkflow: derivation.refreshWorkflow,
		isItemDone: derivation.isItemDone,
		isCredentialConfigured: derivation.isCredentialConfigured,
	};
}
